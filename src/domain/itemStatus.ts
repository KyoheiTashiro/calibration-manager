/**
 * 点検校正項目のステータス導出（domain-model.md §4.3）。
 * 保存しない派生値であり、表示のたびにこの関数で導出する（coding-standards.md §5）。
 */

import { recommendedOrderDate } from "@/domain/leadTime";
import { isActiveOrderStatus } from "@/domain/orderStatus";
import {
  type CalibrationOrder,
  EXECUTION,
  type InspectionItem,
  type IsoDateString,
  ORDER_STATUS,
  type Vendor,
} from "@/store/types";
import { addDays } from "@/utils/time";

/**
 * 項目ステータス（導出値）。エンティティ属性ではないため store/types.ts でなくここに定義する。
 * 表示色・ラベルは domain/statusBadge.ts が対応する。
 */
export const ITEM_STATUS = {
  OVERDUE: "overdue",
  ORDER_NOW: "orderNow",
  IN_PROGRESS: "inProgress",
  DUE_SOON: "dueSoon",
  OK: "ok",
} as const;
export type ItemStatus = (typeof ITEM_STATUS)[keyof typeof ITEM_STATUS];

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
 * なぜ vendor を引数に取るか（docs のシグネチャ `(item, orders, today)` からの拡張）:
 * 発注推奨日の納期解決に `item.leadTimeDays ?? vendor.standardLeadTimeDays` の
 * フォールバック（§4.2）が必要であり、vendor なしでは orderNow を判定できないため。
 *
 * @param orders 全案件でも当該項目の案件のみでもよい（内部で itemId により絞り込む）
 */
export const deriveItemStatus = (
  item: InspectionItem,
  orders: readonly CalibrationOrder[],
  vendor: Pick<Vendor, "standardLeadTimeDays"> | null,
  today: IsoDateString,
): ItemStatus => {
  if (today > item.nextDueDate) return ITEM_STATUS.OVERDUE;

  const itemOrders = orders.filter((order) => order.itemId === item.id);
  const isExternal = item.execution === EXECUTION.EXTERNAL;

  if (isExternal) {
    const orderDate = recommendedOrderDate(item, vendor);
    const hasActiveOrder = itemOrders.some((order) => isActiveOrderStatus(order.status));
    if (orderDate !== null && today >= orderDate && !hasActiveOrder) return ITEM_STATUS.ORDER_NOW;

    const hasInProgressOrder = itemOrders.some(
      (order) =>
        order.status === ORDER_STATUS.ORDERED || order.status === ORDER_STATUS.IN_CALIBRATION,
    );
    if (hasInProgressOrder) return ITEM_STATUS.IN_PROGRESS;
  }

  const dueSoonFrom = addDays(item.nextDueDate, -item.noticeDaysBefore);
  if (dueSoonFrom !== null && today >= dueSoonFrom) return ITEM_STATUS.DUE_SOON;

  return ITEM_STATUS.OK;
};
