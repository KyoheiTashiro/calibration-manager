import { SERVICE_ITEM_STATUS, type ServiceItemStatus } from "@/domain/serviceItemStatus";
import type { ServiceItemRow } from "@/store/selectors";
import type { Notification } from "@/store/types";

export const SUMMARY_CARD_STATUSES: readonly ServiceItemStatus[] = [
  SERVICE_ITEM_STATUS.OVERDUE,
  SERVICE_ITEM_STATUS.ORDER_NOW,
  SERVICE_ITEM_STATUS.DUE_SOON,
  SERVICE_ITEM_STATUS.IN_PROGRESS,
];

const ACTION_PRIORITY: readonly ServiceItemStatus[] = [
  SERVICE_ITEM_STATUS.OVERDUE,
  SERVICE_ITEM_STATUS.ORDER_NOW,
  SERVICE_ITEM_STATUS.DUE_SOON,
];

export const NOTIFICATION_PREVIEW_LIMIT = 5;

export const countByStatus = (
  rows: readonly ServiceItemRow[],
): Record<ServiceItemStatus, number> => {
  const counts: Record<ServiceItemStatus, number> = {
    [SERVICE_ITEM_STATUS.OVERDUE]: 0,
    [SERVICE_ITEM_STATUS.ORDER_NOW]: 0,
    [SERVICE_ITEM_STATUS.IN_PROGRESS]: 0,
    [SERVICE_ITEM_STATUS.DUE_SOON]: 0,
    [SERVICE_ITEM_STATUS.OK]: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
};

/** serviceItemRowsOf が nextDueDate 昇順・id 昇順を保証済みのため、優先度の安定ソートのみ追加する。 */
export const actionRequiredRows = (rows: readonly ServiceItemRow[]): ServiceItemRow[] =>
  rows
    .filter((row) => ACTION_PRIORITY.includes(row.status))
    .toSorted(
      (left, right) => ACTION_PRIORITY.indexOf(left.status) - ACTION_PRIORITY.indexOf(right.status),
    );

const compareNotifications = (left: Notification, right: Notification): number => {
  if (left.isRead !== right.isRead) return left.isRead ? 1 : -1;
  return right.createdDate.localeCompare(left.createdDate) || left.id.localeCompare(right.id);
};

export const latestNotifications = (
  notifications: Record<string, Notification>,
  limit: number = NOTIFICATION_PREVIEW_LIMIT,
): Notification[] => Object.values(notifications).toSorted(compareNotifications).slice(0, limit);
