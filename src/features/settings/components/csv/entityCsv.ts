/**
 * エンティティ ⇔ CSV の列仕様(§11、D-028)。
 * 列 = store/schema.ts の zod shape 定義順、ヘッダ = フィールド名の英語キー。
 * boolean は true/false、optional 未設定は空セル、数値は10進文字列。
 * CSV 文字列レベルの直列化・パースは utils/csv.ts、行の検証は ./importValidation.ts が担う。
 */

import {
  equipmentSchema,
  notificationSchema,
  personSchema,
  serviceItemSchema,
  serviceOrderSchema,
  serviceRecordSchema,
  vendorSchema,
} from "@/store/schema";
import { type AppState, NOTIFICATION_TARGET_TYPE } from "@/store/types";
import { serializeCsv } from "@/utils/csv";
import { z } from "zod";

/** CSV 対象エンティティ種別 = AppState のキー */
export type CsvEntityKind = keyof AppState;

/** インポート/エクスポート対象の種別一覧(§11 のボタン・セレクトの表示順) */
export const CSV_ENTITY_KINDS = [
  "equipment",
  "serviceItems",
  "serviceRecords",
  "serviceOrders",
  "vendors",
  "persons",
  "notifications",
] as const satisfies readonly CsvEntityKind[];

/** 列の基底型。optional かどうかとは独立で、セル文字列 ⇔ フィールド値の変換規則を決める(D-028) */
export const CSV_COLUMN_TYPE = {
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
} as const;
export type CsvColumnType = (typeof CSV_COLUMN_TYPE)[keyof typeof CSV_COLUMN_TYPE];

/** 種別 Kind のエンティティ型。列仕様のほか importValidation が共用する */
export type EntityOf<Kind extends CsvEntityKind> = AppState[Kind][string];

/**
 * 10進数値として解釈可能なセルの判定(D-028 の数値セル規則)。
 * importValidation の数値変換(`Number("") === 0` の誤変換防止)と、
 * 数式インジェクション警告の負数除外(`-20` は数式扱いしない、D-053)が共用する。
 */
export const NUMBER_CELL_PATTERN = /^-?\d+(?:\.\d+)?$/u;

export type CsvColumn<Entity> = {
  key: keyof Entity & string;
  type: CsvColumnType;
  /** true なら空セル ⇔ undefined(D-028 の optional セル規則) */
  optional: boolean;
};

/** 外向き参照(FK)1件の宣言。target は固定種別、またはエンティティの値で分岐する関数(notifications.targetId 等) */
export type CsvReference<Entity> = {
  key: keyof Entity & string;
  target: CsvEntityKind | ((entity: Entity) => CsvEntityKind);
};

export type EntityCsvSpec<Entity> = {
  /** UI 表示用の日本語ラベル(§11 のボタン文言) */
  label: string;
  /** ヘッダ行と一致すべき列定義(宣言順 = schema.shape の宣言順) */
  columns: readonly CsvColumn<Entity>[];
  /** 行単位バリデーション用スキーマ(store/schema.ts 流用) */
  schema: z.ZodType<Entity>;
  /** id 以外のファイル内ユニーク制約(equipment.managementNo など) */
  uniqueKeys: readonly (keyof Entity & string)[];
  /** 外向き参照(FK)の一覧。突合先の存在チェックは importValidation.ts が行う(D-029) */
  references: readonly CsvReference<Entity>[];
};

/**
 * schema.shape の1フィールドから CSV 列の型・optional を判定する(D-028)。
 * ZodOptional でラップされていれば optional 判定して unwrap し、inner が
 * ZodNumber → 数値、ZodBoolean → 真偽値、それ以外(ZodString・ZodEnum・refine付き)→ 文字列とする。
 */
const columnTypeOf = (field: z.ZodType): { type: CsvColumnType; optional: boolean } => {
  const optional = field instanceof z.ZodOptional;
  const inner = optional ? field.unwrap() : field;
  if (inner instanceof z.ZodNumber) return { type: CSV_COLUMN_TYPE.NUMBER, optional };
  if (inner instanceof z.ZodBoolean) return { type: CSV_COLUMN_TYPE.BOOLEAN, optional };
  return { type: CSV_COLUMN_TYPE.STRING, optional };
};

/**
 * ZodObject の shape を取り出す。EntityCsvSpec.schema の型は z.ZodType<Entity> だが、
 * 実体は必ず store/schema.ts の z.object(...)(必要なら .superRefine 付き、this を返すため shape は保持される)。
 * 型 z.ZodType には shape が無いため取り出しにアサーションを要する。
 */
const shapeOf = (schema: z.ZodType): Record<string, z.ZodType> =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- 上記コメントの理由により実体は必ず ZodObject
  (schema as unknown as { shape: Record<string, z.ZodType> }).shape;

/** schema.shape から columns を導出する(キー順 = shape の宣言順、現行 columns 順と一致・検証済み) */
const columnsOf = <Entity>(schema: z.ZodType<Entity>): readonly CsvColumn<Entity>[] =>
  Object.entries(shapeOf(schema)).map(([key, field]) => {
    const { type, optional } = columnTypeOf(field);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- schema.ts の AssertEqual 群が shape のキー集合 = エンティティキー集合であることを保証する
    return { key: key as keyof Entity & string, type, optional };
  });

/** ENTITY_CSV_SPECS の1エントリを組み立てる(columns は schema から導出するため引数に含めない) */
const defineSpec = <Entity>(
  label: string,
  schema: z.ZodType<Entity>,
  uniqueKeys: readonly (keyof Entity & string)[],
  references: readonly CsvReference<Entity>[],
): EntityCsvSpec<Entity> => ({
  label,
  columns: columnsOf(schema),
  schema,
  uniqueKeys,
  references,
});

export const ENTITY_CSV_SPECS: { [Kind in CsvEntityKind]: EntityCsvSpec<EntityOf<Kind>> } = {
  equipment: defineSpec(
    "機器",
    equipmentSchema,
    ["managementNo"],
    [{ key: "manufacturerId", target: "vendors" }],
  ),
  serviceItems: defineSpec(
    "点検校正項目",
    serviceItemSchema,
    [],
    [
      { key: "equipmentId", target: "equipment" },
      { key: "vendorId", target: "vendors" },
      { key: "personId", target: "persons" },
    ],
  ),
  serviceRecords: defineSpec(
    "実施記録",
    serviceRecordSchema,
    [],
    [
      { key: "serviceItemId", target: "serviceItems" },
      { key: "serviceOrderId", target: "serviceOrders" },
    ],
  ),
  serviceOrders: defineSpec(
    "点検校正外部案件",
    serviceOrderSchema,
    [],
    [
      { key: "serviceItemId", target: "serviceItems" },
      { key: "vendorId", target: "vendors" },
    ],
  ),
  vendors: defineSpec("メーカー/取引先", vendorSchema, [], []),
  persons: defineSpec("担当者", personSchema, [], []),
  notifications: defineSpec(
    "通知",
    notificationSchema,
    [],
    [
      {
        key: "targetId",
        target: (entity) =>
          entity.targetType === NOTIFICATION_TARGET_TYPE.SERVICE_ITEM
            ? "serviceItems"
            : "serviceOrders",
      },
      { key: "personId", target: "persons" },
    ],
  ),
};

/**
 * フィールド値をセル文字列へ変換する(D-028: undefined → 空、boolean → true/false、数値 → 10進文字列。
 * いずれも String() の既定表現と一致)。columns の型定義上 value は下記3種 + undefined のみで、
 * §8 の例外禁止方針に従い万一の想定外値は空セルとして扱う。
 */
const cellOfValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
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
    .toSorted((left: EntityOf<Kind>, right: EntityOf<Kind>) => (left.id < right.id ? -1 : 1))
    .map((entity: EntityOf<Kind>) => spec.columns.map((column) => cellOfValue(entity[column.key])));
  return serializeCsv([header, ...rows]);
};
