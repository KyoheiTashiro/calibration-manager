/**
 * 点検校正項目の表示定数(screen-design/04-equipment-detail.md / 05-service-item-list.md /
 * 06-service-item-modal.md)。種別・実施区分のラベルをここに一元化し、機器詳細・項目一覧・
 * 点検校正項目モーダルで重複定義しない(features/equipment/constants.ts と同じ運用)。
 */

import {
  CYCLE,
  EXECUTION,
  SERVICE_ITEM_TYPE,
  SERVICE_RECORD_RESULT,
  type Cycle,
  type Execution,
  type ServiceItemType,
  type ServiceRecordResult,
} from "@/store/types";

export const SERVICE_ITEM_TYPE_LABELS = {
  [SERVICE_ITEM_TYPE.INSPECTION]: "点検",
  [SERVICE_ITEM_TYPE.CALIBRATION]: "校正",
} as const satisfies Record<ServiceItemType, string>;

export const EXECUTION_LABELS = {
  [EXECUTION.INTERNAL]: "内部",
  [EXECUTION.EXTERNAL]: "外部",
} as const satisfies Record<Execution, string>;

export const CYCLE_LABELS = {
  [CYCLE.M1]: "1ヶ月",
  [CYCLE.M3]: "3ヶ月",
  [CYCLE.M6]: "6ヶ月",
  [CYCLE.Y1]: "1年",
  [CYCLE.Y2]: "2年",
  [CYCLE.Y3]: "3年",
  [CYCLE.Y5]: "5年",
  [CYCLE.Y10]: "10年",
} as const satisfies Record<Cycle, string>;

export const CYCLE_OPTIONS: readonly { value: Cycle; label: string }[] = Object.values(CYCLE).map(
  (cycle) => ({ value: cycle, label: CYCLE_LABELS[cycle] }),
);

export const SERVICE_ITEM_TYPE_OPTIONS: readonly { value: ServiceItemType; label: string }[] =
  Object.values(SERVICE_ITEM_TYPE).map((type) => ({
    value: type,
    label: SERVICE_ITEM_TYPE_LABELS[type],
  }));

export const EXECUTION_OPTIONS: readonly { value: Execution; label: string }[] = Object.values(
  EXECUTION,
).map((execution) => ({ value: execution, label: EXECUTION_LABELS[execution] }));

export const SERVICE_RECORD_RESULT_LABELS = {
  [SERVICE_RECORD_RESULT.PASS]: "合格",
  [SERVICE_RECORD_RESULT.FAIL]: "不合格",
  [SERVICE_RECORD_RESULT.ADJUSTED]: "調整合格",
} as const satisfies Record<ServiceRecordResult, string>;

export const SERVICE_RECORD_RESULT_OPTIONS: readonly {
  value: ServiceRecordResult;
  label: string;
}[] = Object.values(SERVICE_RECORD_RESULT).map((result) => ({
  value: result,
  label: SERVICE_RECORD_RESULT_LABELS[result],
}));
