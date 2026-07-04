/**
 * ドメインロジックのマジックナンバー集約（coding-standards.md §8）。
 * 期限計算・通知判定で使う既定値はすべてここに JSDoc 付きで定義する。
 */

/**
 * 発注余裕日数のデフォルト（domain-model.md §3.4 ServiceItem.bufferDays）。
 * 発注推奨日 = nextDueDate − leadTime − bufferDays の余裕分。
 */
export const DEFAULT_BUFFER_DAYS = 14;

/**
 * 通知開始日数のデフォルト（domain-model.md §3.4 ServiceItem.noticeDaysBefore）。
 * 期限の何日前から dueSoon 通知・ステータスを出すか。
 */
export const DEFAULT_NOTICE_DAYS_BEFORE = 30;

/**
 * 納期接近（deliveryDueSoon）通知を出し始める、返却予定日までの日数
 * （domain-model.md §3.7: 今日 ≥ 返却予定日 − 7日 かつ 未返却）。
 */
export const DELIVERY_DUE_SOON_NOTICE_DAYS = 7;
