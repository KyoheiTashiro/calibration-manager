/**
 * 点検校正項目のステータス導出（domain-model.md §4.3）。
 * 保存しない派生値であり、表示のたびにこの関数で導出する。
 */

import { recommendedOrderDate } from '@/domain/leadTime';
import { hasActiveServiceOrder, isAwaitingReturnStatus } from '@/domain/serviceOrderStatus';
import {
  type ServiceOrder,
  EXECUTION,
  type ServiceItem,
  type IsoDateString,
  type Vendor,
} from '@/store/types';
import { addDays } from '@/utils/time';

/**
 * 項目ステータス（導出値）。エンティティ属性ではないため store/types.ts でなくここに定義する。
 * 表示色・ラベルは domain/statusBadge.ts が対応する。
 */
export const SERVICE_ITEM_STATUS = {
  OVERDUE: 'overdue',
  ORDER_NOW: 'orderNow',
  IN_PROGRESS: 'inProgress',
  DUE_SOON: 'dueSoon',
  OK: 'ok',
} as const;
export type ServiceItemStatus = (typeof SERVICE_ITEM_STATUS)[keyof typeof SERVICE_ITEM_STATUS];

/**
 * 期限接近（今日 ≥ nextDueDate − noticeDaysBefore）。項目ステータス dueSoon と
 * 通知 dueSoon で共用する。期限超過との排他は呼び出し側で先に判定する。
 */
export const isDueSoon = (
  serviceItem: Pick<ServiceItem, 'nextDueDate' | 'noticeDaysBefore'>,
  today: IsoDateString,
): boolean => {
  const dueSoonFrom = addDays(serviceItem.nextDueDate, -serviceItem.noticeDaysBefore);
  return dueSoonFrom !== null && today >= dueSoonFrom;
};

/**
 * 発注時期到来（今日 ≥ 発注推奨日 かつ 有効な案件なし）。項目ステータス orderNow と
 * 通知 orderRecommended で共用する（D-042）。
 */
export const isOrderDue = (
  serviceItem: ServiceItem,
  vendor: Pick<Vendor, 'standardLeadTimeDays'> | null,
  serviceOrders: readonly ServiceOrder[],
  today: IsoDateString,
): boolean => {
  const orderDate = recommendedOrderDate(serviceItem, vendor);
  return (
    orderDate !== null &&
    today >= orderDate &&
    !hasActiveServiceOrder(serviceOrders, serviceItem.id)
  );
};

/**
 * 項目ステータスを優先度順（overdue > orderNow > inProgress > dueSoon > ok）に判定する。
 *
 * | ステータス | 条件 |
 * |---|---|
 * | overdue | 今日 > nextDueDate |
 * | orderNow | 外部 かつ 今日 ≥ 発注推奨日 かつ 有効な案件なし |
 * | inProgress | 外部 かつ ordered/inCalibration の案件あり |
 * | dueSoon | 今日 ≥ nextDueDate − noticeDaysBefore |
 * | ok | 上記以外 |
 *
 * なぜ vendor を引数に取るか（docs のシグネチャ `(serviceItem, serviceOrders, today)` からの拡張）:
 * 発注推奨日の納期解決に `serviceItem.leadTimeDays ?? vendor.standardLeadTimeDays` の
 * フォールバック（§4.2）が必要であり、vendor なしでは orderNow を判定できないため。
 *
 * @param serviceOrders 全案件でも当該項目の案件のみでもよい（内部で serviceItemId により絞り込む）
 */
export const deriveServiceItemStatus = (
  serviceItem: ServiceItem,
  serviceOrders: readonly ServiceOrder[],
  vendor: Pick<Vendor, 'standardLeadTimeDays'> | null,
  today: IsoDateString,
): ServiceItemStatus => {
  if (today > serviceItem.nextDueDate) return SERVICE_ITEM_STATUS.OVERDUE;

  const itemServiceOrders = serviceOrders.filter(
    (serviceOrder) => serviceOrder.serviceItemId === serviceItem.id,
  );
  const isExternal = serviceItem.execution === EXECUTION.EXTERNAL;

  if (isExternal) {
    if (isOrderDue(serviceItem, vendor, itemServiceOrders, today)) {
      return SERVICE_ITEM_STATUS.ORDER_NOW;
    }
    const hasInProgressServiceOrder = itemServiceOrders.some((serviceOrder) =>
      isAwaitingReturnStatus(serviceOrder.status),
    );
    if (hasInProgressServiceOrder) return SERVICE_ITEM_STATUS.IN_PROGRESS;
  }

  if (isDueSoon(serviceItem, today)) return SERVICE_ITEM_STATUS.DUE_SOON;

  return SERVICE_ITEM_STATUS.OK;
};
