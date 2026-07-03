/**
 * 校正案件一覧（かんばん、screen-design/08-orders.md）。
 * 状態別の4列（発注準備/発注済/校正中/返却済）でカードを表示し、隣接遷移のみをアクションで提供する。
 * トグル「完了/中止も表示」ON で記録登録済/中止の2列を右側に追加（D-018）。案件作成の導線は本画面には持たず、
 * 起動元は項目一覧（Phase 8）。状態遷移・属性更新はストア（updateOrderStatus / updateOrder）が最終検証する。
 */

import { RecordModal } from "@/components/domain";
import { Button, Checkbox, ConfirmModal, EmptyState } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { OrderCard } from "@/features/orders/components/OrderCard";
import { OrderDialog, ReturnDialog } from "@/features/orders/components/TransitionDialogs";
import {
  KANBAN_ACTIVE_COLUMNS,
  KANBAN_CLOSED_COLUMNS,
  ORDER_STATUS_LABELS,
} from "@/features/orders/constants";
import { ORDER_STATUS, type CalibrationOrder, type OrderStatus } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";

/** カード操作で開くダイアログ種別（画面ローカルの UI 状態。ドメイン列挙とは別軸） */
const DIALOG_TYPE = {
  ORDER: "order",
  RETURN: "return",
  CANCEL: "cancel",
  RECORD: "record",
} as const;
type DialogType = (typeof DIALOG_TYPE)[keyof typeof DIALOG_TYPE];
type DialogState = { type: DialogType; order: CalibrationOrder };

/** 列ヘッダの状態別アクセント色（色 + 日本語ラベル併記の規約に沿う視覚区別） */
const COLUMN_ACCENT_CLASS = {
  [ORDER_STATUS.PLANNED]: "border-t-slate-400",
  [ORDER_STATUS.ORDERED]: "border-t-blue-400",
  [ORDER_STATUS.IN_CALIBRATION]: "border-t-amber-400",
  [ORDER_STATUS.RETURNED]: "border-t-emerald-500",
  [ORDER_STATUS.COMPLETED]: "border-t-slate-300",
  [ORDER_STATUS.CANCELLED]: "border-t-red-300",
} as const satisfies Record<OrderStatus, string>;

/**
 * 列内カードの決定的な並び: dueDate 昇順（未設定は末尾）→ id 昇順。
 * ISO日付文字列は辞書順比較がそのまま日付順（utils/time.ts）。
 */
const compareOrdersForColumn = (left: CalibrationOrder, right: CalibrationOrder): number => {
  if (left.dueDate !== right.dueDate) {
    if (left.dueDate === undefined) return 1;
    if (right.dueDate === undefined) return -1;
    return left.dueDate.localeCompare(right.dueDate);
  }
  return left.id.localeCompare(right.id);
};

export const OrderList = (): ReactElement => {
  const navigate = useNavigate();
  const orders = useAppStore((state) => state.orders);
  const inspectionItems = useAppStore((state) => state.inspectionItems);
  const equipment = useAppStore((state) => state.equipment);
  const vendors = useAppStore((state) => state.vendors);
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);

  const [showClosed, setShowClosed] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const displayedColumns: readonly OrderStatus[] = showClosed
    ? [...KANBAN_ACTIVE_COLUMNS, ...KANBAN_CLOSED_COLUMNS]
    : KANBAN_ACTIVE_COLUMNS;

  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, CalibrationOrder[]> = {
      [ORDER_STATUS.PLANNED]: [],
      [ORDER_STATUS.ORDERED]: [],
      [ORDER_STATUS.IN_CALIBRATION]: [],
      [ORDER_STATUS.RETURNED]: [],
      [ORDER_STATUS.COMPLETED]: [],
      [ORDER_STATUS.CANCELLED]: [],
    };
    for (const order of Object.values(orders)) {
      grouped[order.status].push(order);
    }
    for (const status of Object.keys(grouped) as OrderStatus[]) {
      grouped[status] = grouped[status].toSorted(compareOrdersForColumn);
    }
    return grouped;
  }, [orders]);

  // 空状態(全列0件)は表示トグルに関わらず「全ステータス合計0件」で判定する。
  // displayedColumns（表示中の列）だけを対象にすると、例えば completed のみ1件でトグルOFFの場合に
  // 進行中4列がたまたま0件なだけで「案件はありません」という事実に反する空状態を出してしまう。
  const totalOrderCount = Object.values(ordersByStatus).reduce(
    (total, columnOrders) => total + columnOrders.length,
    0,
  );

  const closeDialog = (): void => {
    setDialog(null);
  };

  const handleOrder = (order: CalibrationOrder): void => {
    setDialog({ type: DIALOG_TYPE.ORDER, order });
  };
  const handleReturn = (order: CalibrationOrder): void => {
    setDialog({ type: DIALOG_TYPE.RETURN, order });
  };
  const handleCancelRequest = (order: CalibrationOrder): void => {
    setDialog({ type: DIALOG_TYPE.CANCEL, order });
  };
  const handleRecord = (order: CalibrationOrder): void => {
    setDialog({ type: DIALOG_TYPE.RECORD, order });
  };
  const handleAdvance = (order: CalibrationOrder): void => {
    // ordered → inCalibration は入力なしで即時遷移
    updateOrderStatus(order.id, ORDER_STATUS.IN_CALIBRATION);
  };
  const handleConfirmCancel = (): void => {
    if (dialog) {
      updateOrderStatus(dialog.order.id, ORDER_STATUS.CANCELLED);
    }
    closeDialog();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">校正案件</h1>
        <Checkbox
          label="完了/中止も表示"
          checked={showClosed}
          onChange={(event) => setShowClosed(event.target.checked)}
        />
      </div>

      {totalOrderCount === 0 ? (
        <EmptyState
          message="校正案件はありません。点検校正項目一覧から案件を追加できます"
          action={
            <Button onClick={() => navigate(ROUTES.INSPECTION_ITEM_LIST)}>
              点検校正項目一覧へ
            </Button>
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {displayedColumns.map((status) => {
            const columnOrders = ordersByStatus[status];
            return (
              <section key={status} className="w-64 shrink-0">
                <header
                  className={`rounded-t border-t-4 bg-slate-50 px-3 py-2 text-sm font-semibold ${COLUMN_ACCENT_CLASS[status]}`}
                >
                  {ORDER_STATUS_LABELS[status]}
                  <span className="ml-1 font-normal text-slate-500">({columnOrders.length})</span>
                </header>
                <div className="flex flex-col gap-2 py-2">
                  {columnOrders.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-slate-400">なし</p>
                  ) : (
                    columnOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        inspectionItems={inspectionItems}
                        equipment={equipment}
                        vendors={vendors}
                        onOrder={handleOrder}
                        onAdvance={handleAdvance}
                        onReturn={handleReturn}
                        onCancel={handleCancelRequest}
                        onRecord={handleRecord}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {dialog?.type === DIALOG_TYPE.ORDER ? (
        <OrderDialog order={dialog.order} onClose={closeDialog} />
      ) : null}
      {dialog?.type === DIALOG_TYPE.RETURN ? (
        <ReturnDialog order={dialog.order} onClose={closeDialog} />
      ) : null}
      {dialog?.type === DIALOG_TYPE.RECORD ? (
        <RecordModal
          open
          inspectionItemId={dialog.order.inspectionItemId}
          orderId={dialog.order.id}
          onClose={closeDialog}
        />
      ) : null}
      <ConfirmModal
        open={dialog?.type === DIALOG_TYPE.CANCEL}
        title="案件を中止しますか?"
        message="この案件を中止して終了します。この操作は取り消せません。"
        confirmLabel="中止"
        danger
        onConfirm={handleConfirmCancel}
        onCancel={closeDialog}
      />
    </div>
  );
};
