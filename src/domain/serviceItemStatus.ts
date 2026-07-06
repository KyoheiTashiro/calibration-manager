/**
 * 点検校正項目のステータス導出（domain-model.md §4.3）。
 * 保存しない派生値であり、表示のたびにこの関数で導出する。
 */

import { recommendedOrderDate } from "@/domain/leadTime";
import { isActiveServiceOrderStatus } from "@/domain/serviceOrderStatus";
import {
  type ServiceOrder,
  EXECUTION,
  type ServiceItem,
  type IsoDateString,
  SERVICE_ORDER_STATUS,
  type Vendor,
} from "@/store/types";
import { addDays } from "@/utils/time";

/**
 * 項目ステータス（導出値）。エンティティ属性ではないため store/types.ts でなくここに定義する。
 * 表示色・ラベルは domain/statusBadge.ts が対応する。
 */
export const SERVICE_ITEM_STATUS = {
  OVERDUE: "overdue",
  ORDER_NOW: "orderNow",
  IN_PROGRESS: "inProgress",
  DUE_SOON: "dueSoon",
  OK: "ok",
} as const;
export type ServiceItemStatus = (typeof SERVICE_ITEM_STATUS)[keyof typeof SERVICE_ITEM_STATUS];

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
  vendor: Pick<Vendor, "standardLeadTimeDays"> | null,
  today: IsoDateString,
): ServiceItemStatus => {
  if (today > serviceItem.nextDueDate) return SERVICE_ITEM_STATUS.OVERDUE;

  const itemServiceOrders = serviceOrders.filter(
    (serviceOrder) => serviceOrder.serviceItemId === serviceItem.id,
  );
  const isExternal = serviceItem.execution === EXECUTION.EXTERNAL;

  if (isExternal) {
    const orderDate = recommendedOrderDate(serviceItem, vendor);
    const hasActiveServiceOrder = itemServiceOrders.some((serviceOrder) =>
      isActiveServiceOrderStatus(serviceOrder.status),
    );
    if (orderDate !== null && today >= orderDate && !hasActiveServiceOrder) {
      return SERVICE_ITEM_STATUS.ORDER_NOW;
    }

    const hasInProgressServiceOrder = itemServiceOrders.some(
      (serviceOrder) =>
        serviceOrder.status === SERVICE_ORDER_STATUS.ORDERED ||
        serviceOrder.status === SERVICE_ORDER_STATUS.IN_CALIBRATION,
    );
    if (hasInProgressServiceOrder) return SERVICE_ITEM_STATUS.IN_PROGRESS;
  }

  const dueSoonFrom = addDays(serviceItem.nextDueDate, -serviceItem.noticeDaysBefore);
  if (dueSoonFrom !== null && today >= dueSoonFrom) return SERVICE_ITEM_STATUS.DUE_SOON;

  return SERVICE_ITEM_STATUS.OK;
};
