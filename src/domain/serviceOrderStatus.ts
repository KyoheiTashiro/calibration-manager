/**
 * 点検校正外部案件の状態遷移テーブル（domain-model.md §3.6）。
 *
 * ```
 * planned → ordered → inCalibration → returned → completed
 *   （planned〜returned の各段階からは cancelled へも遷移可）
 * ```
 *
 * - 遷移は隣接遷移のみ許可（飛び越し不可。screen-design/08-service-orders.md）
 * - completed / cancelled は終端（再遷移不可）
 * - `returned → completed` は実施記録登録（addServiceRecord）のカスケード経由でのみ発生させ、
 *   ストアの updateServiceOrderStatus からは直接指定しない（store.md「アクション仕様」）。
 *   テーブル自体には遷移として存在する（ボードの「記録登録」ボタン表示判定にも使う）。
 */

import { SERVICE_ORDER_STATUS, type ServiceOrderStatus } from "@/store/types";

export const SERVICE_ORDER_STATUS_TRANSITIONS = {
  [SERVICE_ORDER_STATUS.PLANNED]: [SERVICE_ORDER_STATUS.ORDERED, SERVICE_ORDER_STATUS.CANCELLED],
  [SERVICE_ORDER_STATUS.ORDERED]: [
    SERVICE_ORDER_STATUS.IN_CALIBRATION,
    SERVICE_ORDER_STATUS.CANCELLED,
  ],
  [SERVICE_ORDER_STATUS.IN_CALIBRATION]: [
    SERVICE_ORDER_STATUS.RETURNED,
    SERVICE_ORDER_STATUS.CANCELLED,
  ],
  [SERVICE_ORDER_STATUS.RETURNED]: [SERVICE_ORDER_STATUS.COMPLETED, SERVICE_ORDER_STATUS.CANCELLED],
  [SERVICE_ORDER_STATUS.COMPLETED]: [],
  [SERVICE_ORDER_STATUS.CANCELLED]: [],
} as const satisfies Record<ServiceOrderStatus, readonly ServiceOrderStatus[]>;

/** from → to の遷移が許可されているかを判定する */
export const canTransitionServiceOrderStatus = (
  from: ServiceOrderStatus,
  to: ServiceOrderStatus,
): boolean =>
  (SERVICE_ORDER_STATUS_TRANSITIONS[from] as readonly ServiceOrderStatus[]).includes(to);

/**
 * 「有効な案件」= 進行中でまだ完結していない案件（planned / ordered / inCalibration / returned）。
 * 項目ステータスの orderNow 判定（§4.3「有効な案件なし」）、通知の orderRecommended 判定
 * （§3.7「未発注」）、案件作成時の「1項目1有効案件」制約（screen-design/08-service-orders.md）で共用する。
 */
export const isActiveServiceOrderStatus = (status: ServiceOrderStatus): boolean =>
  status !== SERVICE_ORDER_STATUS.COMPLETED && status !== SERVICE_ORDER_STATUS.CANCELLED;
