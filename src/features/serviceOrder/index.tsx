/**
 * 点検校正外部案件（かんばん、screen-design/08-service-orders.md）。
 * 状態別の4列（発注準備/発注済/校正中/返却済）でカードを表示し、隣接遷移のみをアクションで提供する。
 * 案件作成の導線は本画面には持たず、起動元は項目一覧（Phase 8）。状態遷移・属性更新はストア
 * （updateServiceOrderStatus / updateServiceOrder）が最終検証する。
 */

import { ServiceRecordModal } from "@/components/domain";
import { Button, Checkbox, ConfirmModal, EmptyState } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { ServiceOrderCard } from "@/features/serviceOrder/components/ServiceOrderCard";
import {
  ServiceOrderDialog,
  ReturnDialog,
} from "@/features/serviceOrder/components/TransitionDialogs";
import { DIALOG_TYPE, SERVICE_ORDER_STATUS_LABELS } from "@/features/serviceOrder/constants";
import { useServiceOrderKanban } from "@/features/serviceOrder/hooks";
import { SERVICE_ORDER_STATUS, type ServiceOrderStatus } from "@/store/types";
import { useSafeNavigate } from "@/utils/navigation";
import type { ReactElement } from "react";

/** 列ヘッダの状態別アクセント色 */
const COLUMN_ACCENT_CLASS = {
  [SERVICE_ORDER_STATUS.PLANNED]: "border-t-slate-400",
  [SERVICE_ORDER_STATUS.ORDERED]: "border-t-blue-400",
  [SERVICE_ORDER_STATUS.IN_CALIBRATION]: "border-t-amber-400",
  [SERVICE_ORDER_STATUS.RETURNED]: "border-t-emerald-500",
  [SERVICE_ORDER_STATUS.COMPLETED]: "border-t-slate-300",
  [SERVICE_ORDER_STATUS.CANCELLED]: "border-t-red-300",
} as const satisfies Record<ServiceOrderStatus, string>;

export const ServiceOrderList = (): ReactElement => {
  const safeNavigate = useSafeNavigate();
  const {
    serviceItems,
    equipment,
    vendors,
    showClosed,
    setShowClosed,
    displayedColumns,
    serviceOrdersByStatus,
    totalServiceOrderCount,
    dialog,
    closeDialog,
    handleCardAction,
    handleConfirmCancel,
  } = useServiceOrderKanban();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">点検校正外部案件</h1>
        <Checkbox
          label="完了/中止も表示"
          checked={showClosed}
          onChange={(event) => {
            setShowClosed(event.target.checked);
          }}
        />
      </div>

      {totalServiceOrderCount === 0 ? (
        <EmptyState
          message="点検校正外部案件はありません。点検校正項目一覧から案件を追加できます"
          action={
            <Button
              onClick={() => {
                safeNavigate(ROUTES.SERVICE_ITEM_LIST);
              }}
            >
              点検校正項目一覧へ
            </Button>
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {displayedColumns.map((status) => {
            const columnServiceOrders = serviceOrdersByStatus[status];
            return (
              <section key={status} className="w-64 shrink-0">
                <header
                  className={`rounded-t border-t-4 bg-slate-50 px-3 py-2 text-sm font-semibold ${COLUMN_ACCENT_CLASS[status]}`}
                >
                  {SERVICE_ORDER_STATUS_LABELS[status]}
                  <span className="ml-1 font-normal text-slate-500">
                    ({columnServiceOrders.length})
                  </span>
                </header>
                <div className="flex flex-col gap-2 py-2">
                  {columnServiceOrders.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-slate-400">なし</p>
                  ) : (
                    columnServiceOrders.map((serviceOrder) => (
                      <ServiceOrderCard
                        key={serviceOrder.id}
                        serviceOrder={serviceOrder}
                        serviceItems={serviceItems}
                        equipment={equipment}
                        vendors={vendors}
                        onAction={handleCardAction}
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
        <ServiceOrderDialog serviceOrder={dialog.serviceOrder} onClose={closeDialog} />
      ) : null}
      {dialog?.type === DIALOG_TYPE.RETURN ? (
        <ReturnDialog serviceOrder={dialog.serviceOrder} onClose={closeDialog} />
      ) : null}
      {dialog?.type === DIALOG_TYPE.SERVICE_RECORD ? (
        <ServiceRecordModal
          open
          serviceItemId={dialog.serviceOrder.serviceItemId}
          serviceOrderId={dialog.serviceOrder.id}
          onClose={closeDialog}
        />
      ) : null}
      <ConfirmModal
        open={dialog?.type === DIALOG_TYPE.CANCEL}
        title="案件を中止しますか?"
        message="この案件を中止して終了します。この操作は取り消せません。"
        confirmLabel="中止"
        onConfirm={handleConfirmCancel}
        onCancel={closeDialog}
      />
    </div>
  );
};
