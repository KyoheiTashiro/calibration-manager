/**
 * 点検校正外部案件（かんばん、screen-design/08-orders.md）の状態管理フック。
 * UI（index.tsx）を薄いビューに保つため切り出す（coding-standards.md §2）。
 */

import { KANBAN_ACTIVE_COLUMNS, KANBAN_CLOSED_COLUMNS } from "@/features/inspectionOrder/constants";
import {
  ORDER_STATUS,
  type CalibrationOrder,
  type Equipment,
  type InspectionItem,
  type OrderStatus,
  type Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useMemo, useState } from "react";

/** カード操作で開くダイアログ種別（画面ローカルの UI 状態。ドメイン列挙とは別軸） */
export const DIALOG_TYPE = {
  ORDER: "order",
  RETURN: "return",
  CANCEL: "cancel",
  RECORD: "record",
} as const;
export type DialogType = (typeof DIALOG_TYPE)[keyof typeof DIALOG_TYPE];
export type DialogState = { type: DialogType; order: CalibrationOrder };

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

type UseOrderKanbanResult = {
  inspectionItems: Record<string, InspectionItem>;
  equipment: Record<string, Equipment>;
  vendors: Record<string, Vendor>;
  showClosed: boolean;
  setShowClosed: (showClosed: boolean) => void;
  displayedColumns: readonly OrderStatus[];
  ordersByStatus: Record<OrderStatus, CalibrationOrder[]>;
  totalOrderCount: number;
  dialog: DialogState | null;
  closeDialog: () => void;
  handleOrder: (order: CalibrationOrder) => void;
  handleReturn: (order: CalibrationOrder) => void;
  handleCancelRequest: (order: CalibrationOrder) => void;
  handleRecord: (order: CalibrationOrder) => void;
  handleAdvance: (order: CalibrationOrder) => void;
  handleConfirmCancel: () => void;
};

/** かんばん画面のロジック一式: store 購読・表示列導出・ダイアログ状態・状態遷移アクション */
export const useOrderKanban = (): UseOrderKanbanResult => {
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
    for (const status of Object.values(ORDER_STATUS)) {
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

  return {
    inspectionItems,
    equipment,
    vendors,
    showClosed,
    setShowClosed,
    displayedColumns,
    ordersByStatus,
    totalOrderCount,
    dialog,
    closeDialog,
    handleOrder,
    handleReturn,
    handleCancelRequest,
    handleRecord,
    handleAdvance,
    handleConfirmCancel,
  };
};
