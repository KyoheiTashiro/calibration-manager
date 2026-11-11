/**
 * 点検校正外部案件（ボード、screen-design/08-service-orders.md）の状態管理フック。
 */

import { isActiveServiceOrderStatus } from '@/domain/serviceOrderStatus';
import {
  CARD_ACTION,
  BOARD_ACTIVE_COLUMNS,
  BOARD_CLOSED_COLUMNS,
  TRANSITION_REJECTED_MESSAGE,
  type CardAction,
  type DialogState,
} from '@/features/serviceOrder/constants';
import {
  SERVICE_ORDER_STATUS,
  type ServiceOrder,
  type Equipment,
  type ServiceItem,
  type ServiceOrderStatus,
  type Vendor,
} from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { useMemo, useState } from 'react';

/**
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

type UseServiceOrderBoardResult = {
  serviceItems: Record<string, ServiceItem>;
  equipment: Record<string, Equipment>;
  vendors: Record<string, Vendor>;
  showClosed: boolean;
  setShowClosed: (showClosed: boolean) => void;
  displayedColumns: readonly ServiceOrderStatus[];
  serviceOrdersByStatus: Record<ServiceOrderStatus, ServiceOrder[]>;
  totalServiceOrderCount: number;
  /** 有効な案件を2件以上持つ項目のid（1項目1有効案件の違反。検出のみで自動修復しない） */
  duplicatedServiceItemIds: ReadonlySet<string>;
  /** ストアが遷移を拒否したときの表示文言。なければ null */
  transitionError: string | null;
  dialog: DialogState | null;
  closeDialog: () => void;
  handleCardAction: (action: CardAction, serviceOrder: ServiceOrder) => void;
  handleConfirmCancel: () => void;
};

export const useServiceOrderBoard = (): UseServiceOrderBoardResult => {
  const serviceOrders = useAppStore((state) => state.serviceOrders);
  const serviceItems = useAppStore((state) => state.serviceItems);
  const equipment = useAppStore((state) => state.equipment);
  const vendors = useAppStore((state) => state.vendors);
  const startServiceOrderCalibration = useAppStore((state) => state.startServiceOrderCalibration);
  const cancelServiceOrder = useAppStore((state) => state.cancelServiceOrder);

  const [showClosed, setShowClosed] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const displayedColumns: readonly ServiceOrderStatus[] = showClosed
    ? [...BOARD_ACTIVE_COLUMNS, ...BOARD_CLOSED_COLUMNS]
    : BOARD_ACTIVE_COLUMNS;

  const serviceOrdersByStatus = useMemo(() => {
    const grouped: Record<ServiceOrderStatus, ServiceOrder[]> = {
      [SERVICE_ORDER_STATUS.PLANNED]: [],
      [SERVICE_ORDER_STATUS.ORDERED]: [],
      [SERVICE_ORDER_STATUS.IN_CALIBRATION]: [],
      [SERVICE_ORDER_STATUS.RETURNED]: [],
      [SERVICE_ORDER_STATUS.COMPLETED]: [],
      [SERVICE_ORDER_STATUS.CANCELLED]: [],
    };
    // 先に全体をソートしてから振り分けると、各列は列内順序を保ったまま並ぶ
    for (const serviceOrder of Object.values(serviceOrders).toSorted(
      compareServiceOrdersForColumn,
    )) {
      grouped[serviceOrder.status].push(serviceOrder);
    }
    return grouped;
  }, [serviceOrders]);

  // 空状態(全列0件)は表示トグルに関わらず「全ステータス合計0件」で判定する。
  // displayedColumns（表示中の列）だけを対象にすると、例えば completed のみ1件でトグルOFFの場合に
  // 進行中4列がたまたま0件なだけで「案件はありません」という事実に反する空状態を出してしまう。
  const totalServiceOrderCount = Object.keys(serviceOrders).length;

  const duplicatedServiceItemIds = useMemo(() => {
    const activeCounts = new Map<string, number>();
    for (const serviceOrder of Object.values(serviceOrders)) {
      if (!isActiveServiceOrderStatus(serviceOrder.status)) continue;
      activeCounts.set(
        serviceOrder.serviceItemId,
        (activeCounts.get(serviceOrder.serviceItemId) ?? 0) + 1,
      );
    }
    return new Set(
      [...activeCounts].filter(([, count]) => count > 1).map(([serviceItemId]) => serviceItemId),
    );
  }, [serviceOrders]);

  const closeDialog = (): void => {
    setDialog(null);
  };

  const handleCardAction = (action: CardAction, serviceOrder: ServiceOrder): void => {
    setTransitionError(null);
    if (action === CARD_ACTION.ADVANCE) {
      if (!startServiceOrderCalibration(serviceOrder.id)) {
        setTransitionError(TRANSITION_REJECTED_MESSAGE);
      }
      return;
    }
    setDialog({ type: action, serviceOrder });
  };
  const handleConfirmCancel = (): void => {
    if (dialog && !cancelServiceOrder(dialog.serviceOrder.id)) {
      setTransitionError(TRANSITION_REJECTED_MESSAGE);
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
    duplicatedServiceItemIds,
    transitionError,
    dialog,
    closeDialog,
    handleCardAction,
    handleConfirmCancel,
  };
};
