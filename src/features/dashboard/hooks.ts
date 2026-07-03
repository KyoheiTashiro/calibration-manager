/**
 * ダッシュボード(screen-design/01-dashboard.md)の集計・選定ロジック。
 * UI(index.tsx / 子コンポーネント)を薄いビューに保つため純関数へ切り出す(coding-standards.md §2)。
 *
 * - 集計対象は buildItemRows(@/features/items/hooks)の結果。稼働機器×有効項目×導出ステータスを
 *   一元化済みのため、ここでは status を数える・絞る・並べるだけを担う(導出ロジックは再実装しない)。
 * - 要対応リストの並び: 優先度 overdue → orderNow → dueSoon。同グループ内は buildItemRows が保証する
 *   nextDueDate 昇順・id 昇順を、安定ソートで維持する(§表示ルール)。
 */

import { ITEM_STATUS, type ItemStatus } from "@/domain/itemStatus";
import type { ItemRow } from "@/features/items/hooks";
import type { Notification } from "@/store/types";

/** サマリーカードの表示順(01-dashboard.md モック: 期限切れ→要発注→期限接近→校正中) */
export const SUMMARY_CARD_STATUSES: readonly ItemStatus[] = [
  ITEM_STATUS.OVERDUE,
  ITEM_STATUS.ORDER_NOW,
  ITEM_STATUS.DUE_SOON,
  ITEM_STATUS.IN_PROGRESS,
];

/**
 * 要対応リストの優先度順(overdue → orderNow → dueSoon)。この配列に含まれない status
 * (inProgress / ok)はリスト対象外(カード集計にのみ反映。§表示ルール)。
 */
const ACTION_PRIORITY: readonly ItemStatus[] = [
  ITEM_STATUS.OVERDUE,
  ITEM_STATUS.ORDER_NOW,
  ITEM_STATUS.DUE_SOON,
];

/** 最新の通知プレビューの表示件数(01-dashboard.md「最新の通知5件」) */
export const NOTIFICATION_PREVIEW_LIMIT = 5;

/** 各ステータスの該当行数を集計する(全 status を 0 初期化してから計上する) */
export const countByStatus = (rows: readonly ItemRow[]): Record<ItemStatus, number> => {
  const counts: Record<ItemStatus, number> = {
    [ITEM_STATUS.OVERDUE]: 0,
    [ITEM_STATUS.ORDER_NOW]: 0,
    [ITEM_STATUS.IN_PROGRESS]: 0,
    [ITEM_STATUS.DUE_SOON]: 0,
    [ITEM_STATUS.OK]: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
};

/**
 * 要対応行(overdue / orderNow / dueSoon)のみを優先度順に並べて返す。
 * buildItemRows が nextDueDate 昇順・id 昇順を保証済みのため、優先度の安定ソートのみ追加する。
 */
export const actionRequiredRows = (rows: readonly ItemRow[]): ItemRow[] =>
  rows
    .filter((row) => ACTION_PRIORITY.includes(row.status))
    .toSorted((left, right) => ACTION_PRIORITY.indexOf(left.status) - ACTION_PRIORITY.indexOf(right.status));

/** 未読優先 → createdDate 降順(新しい順)→ id 昇順(§最新の通知5件) */
const compareNotifications = (left: Notification, right: Notification): number => {
  if (left.isRead !== right.isRead) return left.isRead ? 1 : -1;
  return right.createdDate.localeCompare(left.createdDate) || left.id.localeCompare(right.id);
};

/** 最新の通知を選定順(未読優先→新しい順→id昇順)に limit 件返す */
export const latestNotifications = (
  notifications: Record<string, Notification>,
  limit: number = NOTIFICATION_PREVIEW_LIMIT,
): Notification[] => Object.values(notifications).toSorted(compareNotifications).slice(0, limit);
