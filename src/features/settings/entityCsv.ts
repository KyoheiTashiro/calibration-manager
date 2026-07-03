/**
 * エンティティ ⇔ CSV の列仕様(§11、D-028)。
 * 列 = store/types.ts のフィールド宣言順、ヘッダ = フィールド名の英語キー。
 * boolean は true/false、optional 未設定は空セル、数値は10進文字列。
 * CSV 文字列レベルの直列化・パースは utils/csv.ts、行の検証は ./importValidation.ts が担う。
 */

import {
  calibrationOrderSchema,
  equipmentSchema,
  inspectionItemSchema,
  inspectionRecordSchema,
  notificationSchema,
  personSchema,
  vendorSchema,
} from "@/store/schema";
import type { AppState } from "@/store/types";
import { serializeCsv } from "@/utils/csv";
import type { z } from "zod";

/** CSV 対象エンティティ種別 = AppState のキー */
export type CsvEntityKind = keyof AppState;

/** インポート/エクスポート対象の種別一覧(§11 のボタン・セレクトの表示順) */
export const CSV_ENTITY_KINDS = [
  "equipment",
  "inspectionItems",
  "records",
  "orders",
  "vendors",
  "persons",
  "notifications",
] as const satisfies readonly CsvEntityKind[];

/** 列の値種別。セル文字列 ⇔ フィールド値の変換規則を決める(D-028) */
export const CSV_COLUMN_KIND = {
  STRING: "string",
  OPTIONAL_STRING: "optionalString",
  NUMBER: "number",
  OPTIONAL_NUMBER: "optionalNumber",
  BOOLEAN: "boolean",
} as const;
export type CsvColumnKind = (typeof CSV_COLUMN_KIND)[keyof typeof CSV_COLUMN_KIND];

type EntityOf<Kind extends CsvEntityKind> = AppState[Kind][string];

export type CsvColumn<Entity> = {
  key: keyof Entity & string;
  kind: CsvColumnKind;
};

export type EntityCsvSpec<Kind extends CsvEntityKind> = {
  /** UI 表示用の日本語ラベル(§11 のボタン文言) */
  label: string;
  /** ヘッダ行と一致すべき列定義(宣言順) */
  columns: readonly CsvColumn<EntityOf<Kind>>[];
  /** 行単位バリデーション用スキーマ(store/schema.ts 流用) */
  schema: z.ZodType<EntityOf<Kind>>;
  /** id 以外のファイル内ユニーク制約(equipment.managementNo など) */
  uniqueKeys: readonly (keyof EntityOf<Kind> & string)[];
};

export const ENTITY_CSV_SPECS: { [Kind in CsvEntityKind]: EntityCsvSpec<Kind> } = {
  equipment: {
    label: "機器",
    columns: [
      { key: "id", kind: CSV_COLUMN_KIND.STRING },
      { key: "managementNo", kind: CSV_COLUMN_KIND.STRING },
      { key: "name", kind: CSV_COLUMN_KIND.STRING },
      { key: "model", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "serialNo", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "manufacturerId", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "location", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "status", kind: CSV_COLUMN_KIND.STRING },
      { key: "note", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
    ],
    schema: equipmentSchema,
    uniqueKeys: ["managementNo"],
  },
  inspectionItems: {
    label: "項目",
    columns: [
      { key: "id", kind: CSV_COLUMN_KIND.STRING },
      { key: "equipmentId", kind: CSV_COLUMN_KIND.STRING },
      { key: "type", kind: CSV_COLUMN_KIND.STRING },
      { key: "name", kind: CSV_COLUMN_KIND.STRING },
      { key: "cycle", kind: CSV_COLUMN_KIND.STRING },
      { key: "execution", kind: CSV_COLUMN_KIND.STRING },
      { key: "vendorId", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "leadTimeDays", kind: CSV_COLUMN_KIND.OPTIONAL_NUMBER },
      { key: "bufferDays", kind: CSV_COLUMN_KIND.NUMBER },
      { key: "personId", kind: CSV_COLUMN_KIND.STRING },
      { key: "noticeDaysBefore", kind: CSV_COLUMN_KIND.NUMBER },
      { key: "lastDoneDate", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "nextDueDate", kind: CSV_COLUMN_KIND.STRING },
      { key: "isActive", kind: CSV_COLUMN_KIND.BOOLEAN },
    ],
    schema: inspectionItemSchema,
    uniqueKeys: [],
  },
  records: {
    label: "実施記録",
    columns: [
      { key: "id", kind: CSV_COLUMN_KIND.STRING },
      { key: "inspectionItemId", kind: CSV_COLUMN_KIND.STRING },
      { key: "doneDate", kind: CSV_COLUMN_KIND.STRING },
      { key: "doneBy", kind: CSV_COLUMN_KIND.STRING },
      { key: "result", kind: CSV_COLUMN_KIND.STRING },
      { key: "orderId", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "note", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
    ],
    schema: inspectionRecordSchema,
    uniqueKeys: [],
  },
  orders: {
    label: "案件",
    columns: [
      { key: "id", kind: CSV_COLUMN_KIND.STRING },
      { key: "inspectionItemId", kind: CSV_COLUMN_KIND.STRING },
      { key: "vendorId", kind: CSV_COLUMN_KIND.STRING },
      { key: "status", kind: CSV_COLUMN_KIND.STRING },
      { key: "orderedDate", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "dueDate", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "returnedDate", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "cost", kind: CSV_COLUMN_KIND.OPTIONAL_NUMBER },
      { key: "note", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
    ],
    schema: calibrationOrderSchema,
    uniqueKeys: [],
  },
  vendors: {
    label: "メーカー",
    columns: [
      { key: "id", kind: CSV_COLUMN_KIND.STRING },
      { key: "name", kind: CSV_COLUMN_KIND.STRING },
      { key: "isManufacturer", kind: CSV_COLUMN_KIND.BOOLEAN },
      { key: "isCalibrator", kind: CSV_COLUMN_KIND.BOOLEAN },
      { key: "contactPerson", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "email", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "phone", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "standardLeadTimeDays", kind: CSV_COLUMN_KIND.OPTIONAL_NUMBER },
      { key: "note", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
    ],
    schema: vendorSchema,
    uniqueKeys: [],
  },
  persons: {
    label: "担当者",
    columns: [
      { key: "id", kind: CSV_COLUMN_KIND.STRING },
      { key: "name", kind: CSV_COLUMN_KIND.STRING },
      { key: "email", kind: CSV_COLUMN_KIND.STRING },
      { key: "department", kind: CSV_COLUMN_KIND.OPTIONAL_STRING },
      { key: "isActive", kind: CSV_COLUMN_KIND.BOOLEAN },
    ],
    schema: personSchema,
    uniqueKeys: [],
  },
  notifications: {
    label: "通知",
    columns: [
      { key: "id", kind: CSV_COLUMN_KIND.STRING },
      { key: "type", kind: CSV_COLUMN_KIND.STRING },
      { key: "targetType", kind: CSV_COLUMN_KIND.STRING },
      { key: "targetId", kind: CSV_COLUMN_KIND.STRING },
      { key: "personId", kind: CSV_COLUMN_KIND.STRING },
      { key: "message", kind: CSV_COLUMN_KIND.STRING },
      { key: "createdDate", kind: CSV_COLUMN_KIND.STRING },
      { key: "isRead", kind: CSV_COLUMN_KIND.BOOLEAN },
    ],
    schema: notificationSchema,
    uniqueKeys: [],
  },
};

/** フィールド値をセル文字列へ変換する(D-028: undefined → 空、boolean → true/false) */
const cellOfValue = (value: string | number | boolean | undefined): string => {
  if (value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return value;
};

/**
 * 1エンティティ種別を CSV 文字列(ヘッダ + データ行)へ直列化する。
 * BOM は付与しない(ダウンロード時に UI 側で先頭に付ける)。
 * 行順は id 昇順で安定化(エクスポートの再現性のため)。
 */
export const buildEntityCsv = <Kind extends CsvEntityKind>(
  kind: Kind,
  entities: AppState[Kind],
): string => {
  const spec = ENTITY_CSV_SPECS[kind];
  const header = spec.columns.map((column) => column.key);
  const rows = Object.values(entities)
    .toSorted((left, right) => (left.id < right.id ? -1 : 1))
    .map((entity) => spec.columns.map((column) => cellOfValue(entity[column.key])));
  return serializeCsv([header, ...rows]);
};
