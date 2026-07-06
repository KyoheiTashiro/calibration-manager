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
import type { z } from "zod";

export type CsvEntityKind = keyof AppState;

export const CSV_ENTITY_KINDS = [
  "equipment",
  "serviceItems",
  "serviceRecords",
  "serviceOrders",
  "vendors",
  "persons",
  "notifications",
] as const satisfies readonly CsvEntityKind[];

export type EntityOf<Kind extends CsvEntityKind> = AppState[Kind][string];

/**
 * 10進数値として解釈可能なセルの判定(D-028 の数値セル規則)。
 * importValidation の数値変換(`Number("") === 0` の誤変換防止)と、
 * 数式インジェクション警告の負数除外(`-20` は数式扱いしない、D-053)が共用する。
 */
export const NUMBER_CELL_PATTERN = /^-?\d+(?:\.\d+)?$/u;

export type CsvReference<Entity> = {
  key: keyof Entity & string;
  target: CsvEntityKind | ((entity: Entity) => CsvEntityKind);
};

export type EntityCsvSpec<Entity> = {
  label: string;
  schema: z.ZodType<Entity>;
  /** schema の shape(キー順 = 列順 = 宣言順) */
  shape: Record<string, z.ZodType>;
  uniqueKeys: readonly (keyof Entity & string)[];
  /** 外向き参照(FK)の一覧。突合先の存在チェックは importValidation.ts が行う(D-029) */
  references: readonly CsvReference<Entity>[];
};

/**
 * ZodObject の shape を取り出す。EntityCsvSpec.schema の型は z.ZodType<Entity> だが、
 * 実体は必ず store/schema.ts の z.object(...)(必要なら .superRefine 付き、this を返すため shape は保持される)。
 * 型 z.ZodType には shape が無いため取り出しにアサーションを要する。
 */
const shapeOf = (schema: z.ZodType): Record<string, z.ZodType> =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- 上記コメントの理由により実体は必ず ZodObject
  (schema as unknown as { shape: Record<string, z.ZodType> }).shape;

const defineSpec = <Entity>(
  label: string,
  schema: z.ZodType<Entity>,
  uniqueKeys: readonly (keyof Entity & string)[],
  references: readonly CsvReference<Entity>[],
): EntityCsvSpec<Entity> => ({
  label,
  schema,
  shape: shapeOf(schema),
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

/** shape の型定義上 value は下記3種 + undefined のみで、想定外値は空セルとして扱う */
const cellOfValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

/** BOM は付与しない(ダウンロード時に UI 側で先頭に付ける) */
export const buildEntityCsv = <Kind extends CsvEntityKind>(
  kind: Kind,
  entities: AppState[Kind],
): string => {
  const header = Object.keys(ENTITY_CSV_SPECS[kind].shape);
  const rows = Object.values(entities)
    .toSorted((left: EntityOf<Kind>, right: EntityOf<Kind>) => (left.id < right.id ? -1 : 1))
    .map((entity: EntityOf<Kind>) =>
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- schema.ts の AssertEqual 群が shape のキー集合 = エンティティキー集合であることを保証する
      header.map((key) => cellOfValue(entity[key as keyof EntityOf<Kind>])),
    );
  return serializeCsv([header, ...rows]);
};
