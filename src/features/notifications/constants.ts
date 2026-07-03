/**
 * 通知種別の表示定義（screen-design/10-notifications.md「通知種別のアイコン/色」）。
 * 通知センター・ダッシュボード「最新の通知」が共用する単一マッピング。
 * バッジは常に「色 + 日本語ラベル」をセットで表示する（README §0.3。色のみ禁止）。
 */

import { NOTIFICATION_TYPE, type NotificationType } from "@/store/types";

/** 通知種別→日本語ラベル（screen-design/10-notifications.md の表と一言一句一致させる） */
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
