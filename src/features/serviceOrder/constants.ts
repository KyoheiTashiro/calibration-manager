/**
 * 点検校正外部案件の表示定数(screen-design/08-service-orders.md、domain-model.md §3.6)。
 * 状態ラベルをここに一元化し、ボード・記録モーダル・通知等で重複定義しない
 * (features/equipment/constants.ts / features/serviceItems/constants.ts と同じ運用)。
 */

import { SERVICE_ORDER_STATUS, type ServiceOrder, type ServiceOrderStatus } from "@/store/types";

/** カード操作で開くダイアログ種別（画面ローカルの UI 状態。ドメイン列挙とは別軸） */
export const DIALOG_TYPE = {
  ORDER: "order",
  RETURN: "return",
  CANCEL: "cancel",
  SERVICE_RECORD: "serviceRecord",
} as const;
export type DialogType = (typeof DIALOG_TYPE)[keyof typeof DIALOG_TYPE];
export type DialogState = { type: DialogType; serviceOrder: ServiceOrder };

/** カードのアクション種別 = ダイアログ起動4種 + 即時遷移 advance(画面ローカルUI状態) */
export const CARD_ACTION = {
  ...DIALOG_TYPE,
  ADVANCE: "advance",
} as const;
export type CardAction = (typeof CARD_ACTION)[keyof typeof CARD_ACTION];

/** 案件状態 → 日本語ラベル(domain-model.md §3.6 の状態遷移図表記) */
export const SERVICE_ORDER_STATUS_LABELS = {
  [SERVICE_ORDER_STATUS.PLANNED]: "発注準備",
  [SERVICE_ORDER_STATUS.ORDERED]: "発注済",
  [SERVICE_ORDER_STATUS.IN_CALIBRATION]: "校正中",
  [SERVICE_ORDER_STATUS.RETURNED]: "返却済",
  [SERVICE_ORDER_STATUS.COMPLETED]: "記録登録済",
  [SERVICE_ORDER_STATUS.CANCELLED]: "中止",
} as const satisfies Record<ServiceOrderStatus, string>;

/** ボードの進行中4列(左→右の表示順。08-service-orders.md 準拠) */
export const BOARD_ACTIVE_COLUMNS = [
  SERVICE_ORDER_STATUS.PLANNED,
  SERVICE_ORDER_STATUS.ORDERED,
  SERVICE_ORDER_STATUS.IN_CALIBRATION,
  SERVICE_ORDER_STATUS.RETURNED,
] as const;

/** 「完了/中止も表示」トグルONで右側に追加する終端2列(D-018) */
export const BOARD_CLOSED_COLUMNS = [
  SERVICE_ORDER_STATUS.COMPLETED,
  SERVICE_ORDER_STATUS.CANCELLED,
] as const;
