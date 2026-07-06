import { NOTIFICATION_TYPE, type NotificationType } from "@/store/types";

export const NOTIFICATION_TYPE_LABELS = {
  [NOTIFICATION_TYPE.DUE_SOON]: "期限接近",
  [NOTIFICATION_TYPE.OVERDUE]: "期限超過",
  [NOTIFICATION_TYPE.ORDER_RECOMMENDED]: "要発注",
  [NOTIFICATION_TYPE.DELIVERY_DUE_SOON]: "納期接近",
  [NOTIFICATION_TYPE.DELIVERY_OVERDUE]: "納期超過",
} as const satisfies Record<NotificationType, string>;

/**
 * 通知種別→バッジのTailwindクラス。`-100` 背景 × `-800` 文字 × `-300` 枠線の組は
 * statusBadge.ts と同じ WCAG AA 設計値。deliveryOverdue の「赤(濃)」のみ
 * 一段濃い組（-200/-900/-400）で overdue の赤と区別する。
 */
export const NOTIFICATION_TYPE_BADGE_CLASSES = {
  [NOTIFICATION_TYPE.DUE_SOON]: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  [NOTIFICATION_TYPE.OVERDUE]: "bg-red-100 text-red-800 border border-red-300",
  [NOTIFICATION_TYPE.ORDER_RECOMMENDED]: "bg-orange-100 text-orange-800 border border-orange-300",
  [NOTIFICATION_TYPE.DELIVERY_DUE_SOON]: "bg-purple-100 text-purple-800 border border-purple-300",
  [NOTIFICATION_TYPE.DELIVERY_OVERDUE]: "bg-red-200 text-red-900 border border-red-400",
} as const satisfies Record<NotificationType, string>;

/**
 * 通知種別→アイコングリフ（screen-design/10-notifications.md の表と一致させる）。
 * overdue と deliveryOverdue は色相としては同じ🔴だが、区別は上記バッジの濃淡（-100/-800 と
 * -200/-900）が担うため、グリフ自体は表の通り両方🔴のままでよい。
 */
export const NOTIFICATION_TYPE_ICONS = {
  [NOTIFICATION_TYPE.DUE_SOON]: "🟡",
  [NOTIFICATION_TYPE.OVERDUE]: "🔴",
  [NOTIFICATION_TYPE.ORDER_RECOMMENDED]: "🟠",
  [NOTIFICATION_TYPE.DELIVERY_DUE_SOON]: "🟣",
  [NOTIFICATION_TYPE.DELIVERY_OVERDUE]: "🔴",
} as const satisfies Record<NotificationType, string>;
