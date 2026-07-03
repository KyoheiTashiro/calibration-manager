/**
 * 通知センター（screen-design/10-notifications.md）の並び替え・タブ絞り込み・遷移先解決ロジック。
 * UI（index.tsx）を薄いビューに保つため純関数へ切り出す（coding-standards.md §2）。
 *
 * - 各タブ内は createdDate 降順、同日は id 昇順で決定的に並べる（10-notifications.md「表示ルール」）。
 * - 行クリックの遷移先は D-027 に従い解決する。inspectionItem が dangling（削除済み）なら null を返し、
 *   呼び出し側は既読化のみで遷移しない。
 */

import { equipmentDetailPath, ROUTES } from "@/constants/routes";
import { NOTIFICATION_TARGET_TYPE, type InspectionItem, type Notification } from "@/store/types";
import { recordValue } from "@/utils/record";

/** 通知センターのタブ（画面ローカルUI状態）。既定は未読（10-notifications.md「操作・アクション」） */
export const NOTIFICATION_TAB = {
  UNREAD: "unread",
  READ: "read",
} as const;
export type NotificationTab = (typeof NOTIFICATION_TAB)[keyof typeof NOTIFICATION_TAB];

/**
 * createdDate 降順・同日 id 昇順で決定的に並べる（10-notifications.md「表示ルール」）。
 * ISO 日付文字列は辞書順比較がそのまま日付順比較になる（utils/time.ts）。
 */
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

/** 指定タブ（未読/既読）に該当する通知を抽出し、表示順に整列して返す */
export const selectTabNotifications = (
  notifications: readonly Notification[],
  tab: NotificationTab,
): Notification[] => {
  const isRead = tab === NOTIFICATION_TAB.READ;
  return sortNotifications(notifications.filter((notification) => notification.isRead === isRead));
};

/**
 * 行クリック時の遷移先パスを解決する（D-027）。
 * - targetType=order → 案件一覧。
 * - targetType=inspectionItem → 項目から機器を辿り機器詳細。項目が dangling なら null（遷移しない）。
 */
export const resolveNotificationTarget = (
  notification: Notification,
  inspectionItems: Record<string, InspectionItem>,
): string | null => {
  if (notification.targetType === NOTIFICATION_TARGET_TYPE.ORDER) {
    return ROUTES.ORDER_LIST;
  }
  const inspectionItem = recordValue(inspectionItems, notification.targetId);
  if (!inspectionItem) return null;
  return equipmentDetailPath(inspectionItem.equipmentId);
};
