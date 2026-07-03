/**
 * inspectionItemRowsOf(store/selectors)と項目一覧フィルタ(features/inspectionItems/hooks)の純関数テストで共有する固定データ。
 * 両テストが同じ機器・担当者・依頼先を前提に組み立てるため、重複を避けて一箇所へ集約する。
 * today は引数注入なので固定日付で決定的にする(flakiness 回避)。
 */

import type { InspectionItemRow } from "@/store/selectors";
import {
  EQUIPMENT_STATUS,
  EXECUTION,
  INSPECTION_ITEM_TYPE,
  type AppState,
  type CalibrationOrder,
  type Equipment,
  type InspectionItem,
  type Person,
  type Vendor,
} from "@/store/types";

/** 導出の基準日(2026-07-03) */
export const TODAY = "2026-07-03";

export const activePerson: Person = {
  id: "p-active",
  name: "田中",
  email: "a@x.jp",
  isActive: true,
};
export const inactivePerson: Person = { id: "p-inactive", name: "鈴木", email: "b@x.jp", isActive: false }; // prettier-ignore

export const eqActive: Equipment = { id: "eq-active", managementNo: "EQ-1", name: "ノギス", status: EQUIPMENT_STATUS.ACTIVE }; // prettier-ignore
export const eqSuspended: Equipment = { id: "eq-susp", managementNo: "EQ-2", name: "はかり", status: EQUIPMENT_STATUS.SUSPENDED }; // prettier-ignore
export const eqRetired: Equipment = { id: "eq-ret", managementNo: "EQ-3", name: "圧力計", status: EQUIPMENT_STATUS.RETIRED }; // prettier-ignore

export const calibrator: Vendor = {
  id: "v-cal",
  name: "校正センター",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 20,
};

/** 既定は稼働機器・内部点検・有効の項目。over で個別に上書きする */
export const makeInspectionItem = (
  over: Partial<InspectionItem> & Pick<InspectionItem, "id">,
): InspectionItem => ({
  equipmentId: eqActive.id,
  type: INSPECTION_ITEM_TYPE.INSPECTION,
  name: "点検",
  cycle: "1Y",
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: activePerson.id,
  noticeDaysBefore: 30,
  nextDueDate: "2099-01-01",
  isActive: true,
  ...over,
});

/** id をキーにした Record へ畳み込む(store の正規化形へ整形する) */
export const toRecord = <Entry extends { id: string }>(
  list: readonly Entry[],
): Record<string, Entry> => Object.fromEntries(list.map((entry) => [entry.id, entry]));

/** inspectionItems / orders を渡して残りは固定機器・依頼先・担当者で埋めた state を作る */
export const makeState = (
  inspectionItems: readonly InspectionItem[],
  orders: readonly CalibrationOrder[] = [],
): Pick<AppState, "inspectionItems" | "equipment" | "orders" | "vendors" | "persons"> => ({
  inspectionItems: toRecord(inspectionItems),
  equipment: toRecord([eqActive, eqSuspended, eqRetired]),
  orders: toRecord(orders),
  vendors: toRecord([calibrator]),
  persons: toRecord([activePerson, inactivePerson]),
});

/** 行配列から inspectionItem.id 列を取り出す(並び順・絞り込みの検証に使う) */
export const ids = (rows: readonly InspectionItemRow[]): string[] =>
  rows.map((row) => row.inspectionItem.id);
