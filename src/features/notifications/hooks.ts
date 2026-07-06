import { equipmentDetailPath, ROUTES } from "@/constants/routes";
import { NOTIFICATION_TARGET_TYPE, type ServiceItem, type Notification } from "@/store/types";
import { recordValue } from "@/utils/record";

export const NOTIFICATION_TAB = {
  UNREAD: "unread",
  READ: "read",
} as const;
export type NotificationTab = (typeof NOTIFICATION_TAB)[keyof typeof NOTIFICATION_TAB];

export const isNotificationTab = (value: string): value is NotificationTab =>
  Object.values(NOTIFICATION_TAB).some((tab) => tab === value);

/** ISO 日付文字列は辞書順比較がそのまま日付順比較になる（utils/time.ts） */
export const sortNotifications = (notifications: readonly Notification[]): Notification[] =>
  notifications.toSorted((left, right) => {
    if (left.createdDate !== right.createdDate) {
      return left.createdDate > right.createdDate ? -1 : 1;
    }
    if (left.id !== right.id) {
      return left.id > right.id ? 1 : -1;
    }
    return 0;
  });

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
