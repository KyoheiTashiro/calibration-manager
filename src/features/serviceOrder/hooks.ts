/**
 * 点検校正外部案件（かんばん、screen-design/08-service-orders.md）の状態管理フック。
 * UI（index.tsx）を薄いビューに保つため切り出す（coding-standards.md §2）。
 */

import { KANBAN_ACTIVE_COLUMNS, KANBAN_CLOSED_COLUMNS } from "@/features/serviceOrder/constants";
import {
  SERVICE_ORDER_STATUS,
  type ServiceOrder,
  type Equipment,
  type ServiceItem,
  type ServiceOrderStatus,
  type Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useMemo, useState } from "react";

/** カード操作で開くダイアログ種別（画面ローカルの UI 状態。ドメイン列挙とは別軸） */
export const DIALOG_TYPE = {
  ORDER: "order",
  RETURN: "return",
  CANCEL: "cancel",
  SERVICE_RECORD: "serviceRecord",
} as const;
export type DialogType = (typeof DIALOG_TYPE)[keyof typeof DIALOG_TYPE];
export type DialogState = { type: DialogType; serviceOrder: ServiceOrder };

/**
 * 列内カードの決定的な並び: dueDate 昇順（未設定は末尾）→ id 昇順。
 * ISO日付文字列は辞書順比較がそのまま日付順（utils/time.ts）。
 */
const compareServiceOrdersForColumn = (left: ServiceOrder, right: ServiceOrder): number => {
  if (left.dueDate !== right.dueDate) {
    if (left.dueDate === undefined) return 1;
    if (right.dueDate === undefined) return -1;
    return left.dueDate.localeCompare(right.dueDate);
  }
  return left.id.localeCompare(right.id);
};

type UseServiceOrderKanbanResult = {
  serviceItems: Record<string, ServiceItem>;
  equipment: Record<string, Equipment>;
  vendors: Record<string, Vendor>;
  showClosed: boolean;
  setShowClosed: (showClosed: boolean) => void;
  displayedColumns: readonly ServiceOrderStatus[];
  serviceOrdersByStatus: Record<ServiceOrderStatus, ServiceOrder[]>;
  totalServiceOrderCount: number;
  dialog: DialogState | null;
  closeDialog: () => void;
  handleOrder: (serviceOrder: ServiceOrder) => void;
  handleReturn: (serviceOrder: ServiceOrder) => void;
  handleCancelRequest: (serviceOrder: ServiceOrder) => void;
  handleRecord: (serviceOrder: ServiceOrder) => void;
  handleAdvance: (serviceOrder: ServiceOrder) => void;
  handleConfirmCancel: () => void;
};

/** かんばん画面のロジック一式: store 購読・表示列導出・ダイアログ状態・状態遷移アクション */
export const useServiceOrderKanban = (): UseServiceOrderKanbanResult => {
  const serviceOrders = useAppStore((state) => state.serviceOrders);
  const serviceItems = useAppStore((state) => state.serviceItems);
  const equipment = useAppStore((state) => state.equipment);
  const vendors = useAppStore((state) => state.vendors);
  const updateServiceOrderStatus = useAppStore((state) => state.updateServiceOrderStatus);

  const [showClosed, setShowClosed] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const displayedColumns: readonly ServiceOrderStatus[] = showClosed
    ? [...KANBAN_ACTIVE_COLUMNS, ...KANBAN_CLOSED_COLUMNS]
    : KANBAN_ACTIVE_COLUMNS;

  const serviceOrdersByStatus = useMemo(() => {
    const grouped: Record<ServiceOrderStatus, ServiceOrder[]> = {
      [SERVICE_ORDER_STATUS.PLANNED]: [],
      [SERVICE_ORDER_STATUS.ORDERED]: [],
      [SERVICE_ORDER_STATUS.IN_CALIBRATION]: [],
      [SERVICE_ORDER_STATUS.RETURNED]: [],
      [SERVICE_ORDER_STATUS.COMPLETED]: [],
      [SERVICE_ORDER_STATUS.CANCELLED]: [],
    };
    for (const serviceOrder of Object.values(serviceOrders)) {
      grouped[serviceOrder.status].push(serviceOrder);
    }
    for (const status of Object.values(SERVICE_ORDER_STATUS)) {
      grouped[status] = grouped[status].toSorted(compareServiceOrdersForColumn);
    }
    return grouped;
  }, [serviceOrders]);

  // 空状態(全列0件)は表示トグルに関わらず「全ステータス合計0件」で判定する。
  // displayedColumns（表示中の列）だけを対象にすると、例えば completed のみ1件でトグルOFFの場合に
  // 進行中4列がたまたま0件なだけで「案件はありません」という事実に反する空状態を出してしまう。
  const totalServiceOrderCount = Object.values(serviceOrdersByStatus).reduce(
    (total, columnServiceOrders) => total + columnServiceOrders.length,
    0,
  );

  const closeDialog = (): void => {
    setDialog(null);
  };

  const handleOrder = (serviceOrder: ServiceOrder): void => {
    setDialog({ type: DIALOG_TYPE.ORDER, serviceOrder });
  };
  const handleReturn = (serviceOrder: ServiceOrder): void => {
    setDialog({ type: DIALOG_TYPE.RETURN, serviceOrder });
  };
  const handleCancelRequest = (serviceOrder: ServiceOrder): void => {
    setDialog({ type: DIALOG_TYPE.CANCEL, serviceOrder });
  };
  const handleRecord = (serviceOrder: ServiceOrder): void => {
    setDialog({ type: DIALOG_TYPE.SERVICE_RECORD, serviceOrder });
  };
  const handleAdvance = (serviceOrder: ServiceOrder): void => {
    // ordered → inCalibration は入力なしで即時遷移
    updateServiceOrderStatus(serviceOrder.id, SERVICE_ORDER_STATUS.IN_CALIBRATION);
  };
  const handleConfirmCancel = (): void => {
    if (dialog) {
      updateServiceOrderStatus(dialog.serviceOrder.id, SERVICE_ORDER_STATUS.CANCELLED);
    }
    closeDialog();
  };

  return {
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
    handleOrder,
    handleReturn,
    handleCancelRequest,
    handleRecord,
    handleAdvance,
    handleConfirmCancel,
  };
};
