/**
 * 点検校正項目の表示定数(screen-design/04-equipment-detail.md / 05-inspection-item-list.md /
 * 06-inspection-item-modal.md)。種別・実施区分のラベルをここに一元化し、機器詳細・項目一覧・
 * 項目編集モーダルで重複定義しない(features/equipment/constants.ts と同じ運用)。
 */

import {
  CYCLE,
  EXECUTION,
  INSPECTION_ITEM_TYPE,
  RECORD_RESULT,
  type Cycle,
  type Execution,
  type InspectionItemType,
  type RecordResult,
} from "@/store/types";

/** 項目種別 → 日本語ラベル(domain-model.md §3.4) */
export const INSPECTION_ITEM_TYPE_LABELS = {
  [INSPECTION_ITEM_TYPE.INSPECTION]: "点検",
  [INSPECTION_ITEM_TYPE.CALIBRATION]: "校正",
} as const satisfies Record<InspectionItemType, string>;

/** 実施区分 → 日本語ラベル(domain-model.md §3.4) */
export const EXECUTION_LABELS = {
  [EXECUTION.INTERNAL]: "内部",
  [EXECUTION.EXTERNAL]: "外部",
} as const satisfies Record<Execution, string>;

/** 周期セレクトの選択肢。表示も "1M" 等の周期表記そのまま(screen-design 06 モック準拠) */
export const CYCLE_OPTIONS: readonly { value: Cycle; label: string }[] = Object.values(CYCLE).map(
  (cycle) => ({ value: cycle, label: cycle }),
);

/** 種別ラジオ(点検/校正)の選択肢(06-inspection-item-modal.md) */
export const INSPECTION_ITEM_TYPE_OPTIONS: readonly { value: InspectionItemType; label: string }[] = Object.entries(
  INSPECTION_ITEM_TYPE_LABELS,
).map(([value, label]) => ({ value: value as InspectionItemType, label }));

/** 実施区分ラジオ(内部/外部)の選択肢(06-inspection-item-modal.md) */
export const EXECUTION_OPTIONS: readonly { value: Execution; label: string }[] = Object.entries(
  EXECUTION_LABELS,
).map(([value, label]) => ({ value: value as Execution, label }));

/** 実施記録の結果 → 日本語ラベル(domain-model.md §3.5、04-equipment-detail.md 実施履歴) */
export const RECORD_RESULT_LABELS = {
  [RECORD_RESULT.PASS]: "合格",
  [RECORD_RESULT.FAIL]: "不合格",
  [RECORD_RESULT.ADJUSTED]: "調整合格",
} as const satisfies Record<RecordResult, string>;

/** 結果ラジオ(合格/不合格/調整合格)の選択肢(07-record-modal.md モック準拠の並び) */
export const RECORD_RESULT_OPTIONS: readonly { value: RecordResult; label: string }[] =
  Object.entries(RECORD_RESULT_LABELS).map(([value, label]) => ({
    value: value as RecordResult,
    label,
  }));
