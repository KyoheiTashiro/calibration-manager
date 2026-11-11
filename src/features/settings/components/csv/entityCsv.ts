import { PHONE_PATTERN, TEXT_LIMIT } from '@/constants/textLimits';
import { isActiveServiceOrderStatus } from '@/domain/serviceOrderStatus';
import {
  equipmentSchema,
  notificationFieldsSchema,
  notificationSchema,
  personSchema,
  serviceItemFieldsSchema,
  serviceItemSchema,
  serviceOrderFieldsSchema,
  serviceOrderSchema,
  serviceRecordSchema,
  vendorSchema,
} from '@/store/schema';
import { type AppState, NOTIFICATION_TARGET_TYPE } from '@/store/types';
import { serializeCsv } from '@/utils/csv';
import { isOneOf } from '@/utils/guard';
import type { z } from 'zod';

export type CsvEntityKind = keyof AppState;

/**
 * 並びは推奨インポート順(D-054 の依存順: 参照される側が先)。
 * エクスポートボタン・インポートの「データの種類」セレクト・マニュアルの列仕様タブが共有する(D-060)。
 */
export const CSV_ENTITY_KINDS = [
  'vendors',
  'persons',
  'equipment',
  'serviceItems',
  'serviceOrders',
  'serviceRecords',
  'notifications',
] as const satisfies readonly CsvEntityKind[];

/** Select / Tabs の onChange 値(string)を CsvEntityKind へ絞り込む */
export const isCsvEntityKind = (value: string): value is CsvEntityKind =>
  isOneOf(value, CSV_ENTITY_KINDS);

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

/** フィールド別の追加検証ルール(文字数上限・形式)。store 側スキーマ(サルベージ用途で寛容)に置けない入口検証 */
export type CsvFieldRule = {
  maxLength?: number;
  pattern?: { regex: RegExp; message: string };
};

/**
 * 複数属性から導く一意制約(D-110)。keyOf が同じ値を返す行がファイル内に2つあればエラー。
 * undefined を返した行は制約の対象外。
 */
export type CsvDerivedUniqueKey<Entity> = {
  /** エラーを付ける列名 */
  column: keyof Entity & string;
  message: string;
  keyOf: (entity: Entity) => string | undefined;
};

export type EntityCsvSpec<Entity> = {
  label: string;
  schema: z.ZodType<Entity>;
  /**
   * 列定義(キー順 = 列順 = 宣言順)。判別 union のエンティティは schema から shape を取れないため、
   * store/schema.ts のフラットな属性定義(xxxFieldsSchema)の shape を渡す。
   */
  shape: Record<string, z.ZodType>;
  uniqueKeys: readonly (keyof Entity & string)[];
  derivedUniqueKeys: readonly CsvDerivedUniqueKey<Entity>[];
  /** 外向き参照(FK)の一覧。突合先の存在チェックは importValidation.ts が行う(D-029) */
  references: readonly CsvReference<Entity>[];
  /**
   * フィールド別の追加検証ルール(文字数上限・形式)。importValidation.ts が zod 検証と併せて適用する。
   * キーは string に広げて保持する(defineSpec の呼び出し側だけ Entity のキーで型チェックすれば十分で、
   * 参照側(importValidation.ts)は列名文字列から引くため `keyof Entity` への絞り込みは不要かつ
   * アサーションなしでは表現できない)。
   */
  fieldRules: Readonly<Record<string, CsvFieldRule>>;
};

/**
 * Entity のキーに限定された fieldRules を string キーの Record へ広げる。
 * Object.entries の戻り値は「値が undefined の可能性」を型上保持するため、
 * 型ガードでの filter だけで `as` なしに Record<string, CsvFieldRule> を得られる。
 */
const widenFieldRules = <Entity>(
  fieldRules: Partial<Record<keyof Entity & string, CsvFieldRule>>,
): Readonly<Record<string, CsvFieldRule>> =>
  Object.fromEntries(
    Object.entries(fieldRules).filter(
      (entry): entry is [string, CsvFieldRule] => entry[1] !== undefined,
    ),
  );

type EntityCsvSpecInput<Entity> = Omit<
  EntityCsvSpec<Entity>,
  'uniqueKeys' | 'derivedUniqueKeys' | 'fieldRules'
> & {
  uniqueKeys?: EntityCsvSpec<Entity>['uniqueKeys'];
  derivedUniqueKeys?: EntityCsvSpec<Entity>['derivedUniqueKeys'];
  fieldRules?: Partial<Record<keyof Entity & string, CsvFieldRule>>;
};

const defineSpec = <Entity>({
  uniqueKeys = [],
  derivedUniqueKeys = [],
  fieldRules = {},
  ...rest
}: EntityCsvSpecInput<Entity>): EntityCsvSpec<Entity> => ({
  ...rest,
  uniqueKeys,
  derivedUniqueKeys,
  fieldRules: widenFieldRules(fieldRules),
});

const PHONE_RULE: CsvFieldRule = {
  maxLength: TEXT_LIMIT.code,
  pattern: { regex: PHONE_PATTERN, message: '半角数字またはハイフンで指定してください' },
};

export const ENTITY_CSV_SPECS: { [Kind in CsvEntityKind]: EntityCsvSpec<EntityOf<Kind>> } = {
  equipment: defineSpec({
    label: '機器',
    schema: equipmentSchema,
    shape: equipmentSchema.shape,
    uniqueKeys: ['managementNo'],
    references: [{ key: 'manufacturerId', target: 'vendors' }],
    fieldRules: {
      managementNo: { maxLength: TEXT_LIMIT.code },
      name: { maxLength: TEXT_LIMIT.name },
      model: { maxLength: TEXT_LIMIT.name },
      serialNo: { maxLength: TEXT_LIMIT.name },
      location: { maxLength: TEXT_LIMIT.name },
      note: { maxLength: TEXT_LIMIT.note },
    },
  }),
  serviceItems: defineSpec({
    label: '点検校正項目',
    schema: serviceItemSchema,
    shape: serviceItemFieldsSchema.shape,
    references: [
      { key: 'equipmentId', target: 'equipment' },
      { key: 'vendorId', target: 'vendors' },
      { key: 'personId', target: 'persons' },
    ],
    fieldRules: { name: { maxLength: TEXT_LIMIT.name } },
  }),
  serviceRecords: defineSpec({
    label: '実施記録',
    schema: serviceRecordSchema,
    shape: serviceRecordSchema.shape,
    references: [
      { key: 'serviceItemId', target: 'serviceItems' },
      { key: 'serviceOrderId', target: 'serviceOrders' },
    ],
    fieldRules: {
      doneBy: { maxLength: TEXT_LIMIT.name },
      note: { maxLength: TEXT_LIMIT.note },
    },
    derivedUniqueKeys: [
      {
        column: 'serviceOrderId',
        message: '同じ案件に紐づく実施記録は1件までです',
        keyOf: (serviceRecord) => serviceRecord.serviceOrderId,
      },
    ],
  }),
  serviceOrders: defineSpec({
    label: '点検校正外部案件',
    schema: serviceOrderSchema,
    shape: serviceOrderFieldsSchema.shape,
    references: [
      { key: 'serviceItemId', target: 'serviceItems' },
      { key: 'vendorId', target: 'vendors' },
    ],
    fieldRules: { note: { maxLength: TEXT_LIMIT.note } },
    derivedUniqueKeys: [
      {
        column: 'serviceItemId',
        message: '有効な案件(発注準備〜返却済)は点検校正項目ごとに1件までです',
        keyOf: (serviceOrder) =>
          isActiveServiceOrderStatus(serviceOrder.status) ? serviceOrder.serviceItemId : undefined,
      },
    ],
  }),
  vendors: defineSpec({
    label: 'メーカー/取引先',
    schema: vendorSchema,
    shape: vendorSchema.shape,
    references: [],
    fieldRules: {
      name: { maxLength: TEXT_LIMIT.name },
      contactPerson: { maxLength: TEXT_LIMIT.name },
      email: { maxLength: TEXT_LIMIT.email },
      phone: PHONE_RULE,
      note: { maxLength: TEXT_LIMIT.note },
    },
  }),
  persons: defineSpec({
    label: '担当者',
    schema: personSchema,
    shape: personSchema.shape,
    references: [],
    fieldRules: {
      name: { maxLength: TEXT_LIMIT.name },
      department: { maxLength: TEXT_LIMIT.name },
      email: { maxLength: TEXT_LIMIT.email },
    },
  }),
  notifications: defineSpec({
    label: '通知',
    schema: notificationSchema,
    shape: notificationFieldsSchema.shape,
    references: [
      {
        key: 'targetId',
        target: (entity) =>
          entity.targetType === NOTIFICATION_TARGET_TYPE.SERVICE_ITEM
            ? 'serviceItems'
            : 'serviceOrders',
      },
      { key: 'personId', target: 'persons' },
    ],
  }),
};

/** エクスポートファイル名。設定画面のダウンロードとマニュアルのファイル名表が共有する(D-065) */
export const entityCsvFileName = (kind: CsvEntityKind, isoDate: string): string =>
  `${kind}_${isoDate}.csv`;

/** shape の型定義上 value は下記3種 + undefined のみで、想定外値は空セルとして扱う */
const cellOfValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
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
