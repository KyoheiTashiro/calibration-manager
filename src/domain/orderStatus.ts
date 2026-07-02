/**
 * 外部校正案件の状態遷移テーブル（domain-model.md §3.6）。
 *
 * ```
 * planned → ordered → inCalibration → returned → completed
 *   （planned〜returned の各段階からは cancelled へも遷移可）
 * ```
 *
 * - 遷移は隣接遷移のみ許可（飛び越し不可。screen-design/08-orders.md）
 * - completed / cancelled は終端（再遷移不可）
 * - `returned → completed` は実施記録登録（addRecord）のカスケード経由でのみ発生させ、
 *   ストアの updateOrderStatus からは直接指定しない（store.md「アクション仕様」）。
 *   テーブル自体には遷移として存在する（かんばんの「記録登録」ボタン表示判定にも使う）。
 */

import { ORDER_STATUS, type OrderStatus } from "@/store/types";

/**
 * 各状態から遷移可能な状態の一覧（許可テーブル）。
 * なぜ satisfies か: ORDER_STATUS に状態が追加された際、この表の定義漏れをビルドエラーで検出するため。
 */
export const ORDER_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PLANNED]: [ORDER_STATUS.ORDERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ORDERED]: [ORDER_STATUS.IN_CALIBRATION, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_CALIBRATION]: [ORDER_STATUS.RETURNED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.RETURNED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

/** from → to の遷移が許可されているかを判定する */
export const canTransitionOrderStatus = (from: OrderStatus, to: OrderStatus): boolean =>
  (ORDER_STATUS_TRANSITIONS[from] as readonly OrderStatus[]).includes(to);

/**
 * 「有効な案件」= 進行中でまだ完結していない案件（planned / ordered / inCalibration / returned）。
 * 項目ステータスの orderNow 判定（§4.3「有効な案件なし」）、通知の orderRecommended 判定
 * （§3.7「未発注」）、案件作成時の「1項目1有効案件」制約（screen-design/08-orders.md）で共用する。
 */
export const isActiveOrderStatus = (status: OrderStatus): boolean =>
  status !== ORDER_STATUS.COMPLETED && status !== ORDER_STATUS.CANCELLED;
