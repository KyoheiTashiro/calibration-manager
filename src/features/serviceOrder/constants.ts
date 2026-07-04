/**
 * 点検校正外部案件の表示定数(screen-design/08-service-orders.md、domain-model.md §3.6)。
 * 状態ラベルをここに一元化し、かんばん・記録モーダル・通知等で重複定義しない
 * (features/equipment/constants.ts / features/serviceItems/constants.ts と同じ運用)。
 */

import { SERVICE_ORDER_STATUS, type ServiceOrderStatus } from "@/store/types";

/** 案件状態 → 日本語ラベル(domain-model.md §3.6 の状態遷移図表記) */
export const SERVICE_ORDER_STATUS_LABELS = {
  [SERVICE_ORDER_STATUS.PLANNED]: "発注準備",
  [SERVICE_ORDER_STATUS.ORDERED]: "発注済",
  [SERVICE_ORDER_STATUS.IN_CALIBRATION]: "校正中",
  [SERVICE_ORDER_STATUS.RETURNED]: "返却済",
  [SERVICE_ORDER_STATUS.COMPLETED]: "記録登録済",
  [SERVICE_ORDER_STATUS.CANCELLED]: "中止",
} as const satisfies Record<ServiceOrderStatus, string>;

/** かんばんの進行中4列(左→右の表示順。08-service-orders.md モック準拠) */
export const KANBAN_ACTIVE_COLUMNS = [
  SERVICE_ORDER_STATUS.PLANNED,
  SERVICE_ORDER_STATUS.ORDERED,
  SERVICE_ORDER_STATUS.IN_CALIBRATION,
  SERVICE_ORDER_STATUS.RETURNED,
] as const;

/** 「完了/中止も表示」トグルONで右側に追加する終端2列(D-018) */
export const KANBAN_CLOSED_COLUMNS = [
  SERVICE_ORDER_STATUS.COMPLETED,
  SERVICE_ORDER_STATUS.CANCELLED,
] as const;
