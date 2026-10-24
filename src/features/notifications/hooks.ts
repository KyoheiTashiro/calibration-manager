import { equipmentDetailPath, ROUTES } from '@/constants/routes';
import { NOTIFICATION_TARGET_TYPE, type ServiceItem, type Notification } from '@/store/types';
import { isOneOf } from '@/utils/guard';
import { recordValue } from '@/utils/record';

export const NOTIFICATION_TAB = {
  UNREAD: 'unread',
  READ: 'read',
} as const;
export type NotificationTab = (typeof NOTIFICATION_TAB)[keyof typeof NOTIFICATION_TAB];

export const isNotificationTab = (value: string): value is NotificationTab =>
  isOneOf(value, Object.values(NOTIFICATION_TAB));

// なぜ localeCompare でなくコード単位比較か: ロケール照合だと id のタイブレーク順が
// 環境依存になる。ISO 日付文字列はコード単位比較がそのまま日付順比較になる（utils/time.ts）
const compareCodeUnits = (left: string, right: string): number =>
  left < right ? -1 : Number(left > right);

/** createdDate 降順・id 昇順 */
export const compareNotificationsByDate = (left: Notification, right: Notification): number =>
  compareCodeUnits(right.createdDate, left.createdDate) || compareCodeUnits(left.id, right.id);

export const sortNotifications = (notifications: readonly Notification[]): Notification[] =>
  notifications.toSorted(compareNotificationsByDate);

export const selectTabNotifications = (
  notifications: readonly Notification[],
  tab: NotificationTab,
): Notification[] => {
  const isRead = tab === NOTIFICATION_TAB.READ;
  return sortNotifications(notifications.filter((notification) => notification.isRead === isRead));
};

export const resolveNotificationTarget = (
  notification: Notification,
  serviceItems: Record<string, ServiceItem>,
): string | null => {
  if (notification.targetType === NOTIFICATION_TARGET_TYPE.SERVICE_ORDER) {
    return ROUTES.SERVICE_ORDER_LIST;
  }
  const serviceItem = recordValue(serviceItems, notification.targetId);
  if (!serviceItem) return null;
  return equipmentDetailPath(serviceItem.equipmentId);
};
