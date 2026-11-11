/**
 * 7エンティティのzodスキーマ（domain-model.md §3）。
 * 用途は2つ: LocalStorage 読込時の検証・サルベージ（store.md「merge」）と、
 * CSVインポートの行単位バリデーション（tech-stack.md「CSVバックアップの方針」）。
 *
 * 型の真実源は ./types.ts であり、`z.infer` を型の源にしない（coding-standards.md §3）。
 * 構造のズレは下部の AssertEqual 群がビルドエラーとして検出する。
 * 方針: ここでは構造・列挙・日付形式のみを検証する（サルベージ用途のため寛容に）。
 * メール形式などの入力体験向けの厳密検証はフォーム側スキーマ（features/*&#47;schema.ts）が担う。
 */

import {
  type AppState,
  type ServiceOrder,
  CYCLE,
  type Equipment,
  EQUIPMENT_STATUS,
  EXECUTION,
  type ServiceItem,
  type ServiceRecord,
  SERVICE_ITEM_TYPE,
  NOTIFICATION_TARGET_TYPE,
  NOTIFICATION_TYPE,
  type Notification,
  SERVICE_ITEM_NOTIFICATION_TYPES,
  SERVICE_ORDER_NOTIFICATION_TYPES,
  SERVICE_ORDER_STATUS,
  type Person,
  SERVICE_RECORD_RESULT,
  type Vendor,
} from '@/store/types';
import { isIsoDateString } from '@/utils/time';
import { z } from 'zod';

/** `YYYY-MM-DD` かつ暦上妥当な日付のみ許可（screen-design/README.md §0.4） */
const isoDateStringSchema = z
  .string()
  .refine(isIsoDateString, { message: 'YYYY-MM-DD形式の日付ではありません' });

const requiredStringSchema = z.string().min(1);

const dayCountSchema = z.number().int().nonnegative();

export const vendorSchema = z.object({
  id: requiredStringSchema,
  name: requiredStringSchema,
  isManufacturer: z.boolean(),
  isCalibrator: z.boolean(),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  standardLeadTimeDays: dayCountSchema.optional(),
  note: z.string().optional(),
});

export const personSchema = z.object({
  id: requiredStringSchema,
  name: requiredStringSchema,
  email: requiredStringSchema,
  department: z.string().optional(),
  isActive: z.boolean(),
});

export const equipmentSchema = z.object({
  id: requiredStringSchema,
  managementNo: requiredStringSchema,
  name: requiredStringSchema,
  model: z.string().optional(),
  serialNo: z.string().optional(),
  manufacturerId: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(EQUIPMENT_STATUS),
  note: z.string().optional(),
});

/**
 * 判別 union 用の属性スキーマ（D-106）。code=custom にするのは、CSV インポートの行エラーへ
 * 日本語メッセージをそのまま出すため（invalid_type だと汎用文言に丸められる）。
 */
const requiredWhen = <Value>(
  isValid: (value: unknown) => boolean,
  message: string,
): z.ZodType<Value, Value> => z.custom<Value>(isValid, message);

const forbiddenWhen = (message: string): z.ZodOptional<z.ZodType<undefined, undefined>> =>
  z.custom<undefined>((value) => value === undefined, message).optional();

const isNonEmptyString = (value: unknown): boolean => typeof value === 'string' && value !== '';
const isIsoDate = (value: unknown): boolean => typeof value === 'string' && isIsoDateString(value);

/**
 * 項目のフラットな属性定義。CSV の列順（entityCsv.ts）と列挙・形式の検証を担う。
 * 属性間の相関（実施区分と依頼先）は下の serviceItemSchema が判別 union で検証する。
 */
export const serviceItemFieldsSchema = z.object({
  id: requiredStringSchema,
  equipmentId: requiredStringSchema,
  type: z.enum(SERVICE_ITEM_TYPE),
  name: requiredStringSchema,
  cycle: z.enum(CYCLE),
  execution: z.enum(EXECUTION),
  vendorId: z.string().optional(),
  leadTimeDays: dayCountSchema.optional(),
  bufferDays: dayCountSchema,
  personId: requiredStringSchema,
  noticeDaysBefore: dayCountSchema,
  lastDoneDate: isoDateStringSchema.optional(),
  nextDueDate: isoDateStringSchema,
  isActive: z.boolean(),
});

const internalServiceItemSchema = serviceItemFieldsSchema.extend({
  execution: z.literal(EXECUTION.INTERNAL),
  vendorId: forbiddenWhen('内部実施の項目は校正依頼先を持てません'),
  leadTimeDays: forbiddenWhen('内部実施の項目は納期を持てません'),
});
const externalServiceItemSchema = serviceItemFieldsSchema.extend({
  execution: z.literal(EXECUTION.EXTERNAL),
  vendorId: requiredWhen<string>(isNonEmptyString, '外部実施の項目には校正依頼先が必要です'),
});

/** 内部実施は依頼先・納期を持てず、外部実施は依頼先が必須（domain-model.md §3.4） */
export const serviceItemSchema = serviceItemFieldsSchema.pipe(
  z.discriminatedUnion('execution', [internalServiceItemSchema, externalServiceItemSchema]),
);

export const serviceRecordSchema = z.object({
  id: requiredStringSchema,
  serviceItemId: requiredStringSchema,
  doneDate: isoDateStringSchema,
  doneBy: requiredStringSchema,
  result: z.enum(SERVICE_RECORD_RESULT),
  serviceOrderId: z.string().optional(),
  note: z.string().optional(),
});

/** 案件のフラットな属性定義（役割は serviceItemFieldsSchema と同じ） */
export const serviceOrderFieldsSchema = z.object({
  id: requiredStringSchema,
  serviceItemId: requiredStringSchema,
  vendorId: requiredStringSchema,
  status: z.enum(SERVICE_ORDER_STATUS),
  orderedDate: isoDateStringSchema.optional(),
  dueDate: isoDateStringSchema.optional(),
  returnedDate: isoDateStringSchema.optional(),
  cost: z.number().nonnegative().optional(),
  note: z.string().optional(),
});

const ORDERED_DATE_REQUIRED = '発注済以降の案件には発注日が必要です';
const RETURNED_DATE_FORBIDDEN = '返却前の案件は実返却日を持てません';

const plannedServiceOrderSchema = serviceOrderFieldsSchema.extend({
  status: z.literal(SERVICE_ORDER_STATUS.PLANNED),
  orderedDate: forbiddenWhen('発注準備の案件は発注日を持てません'),
  returnedDate: forbiddenWhen(RETURNED_DATE_FORBIDDEN),
});
const awaitingReturnServiceOrderSchema = serviceOrderFieldsSchema.extend({
  status: z.literal([SERVICE_ORDER_STATUS.ORDERED, SERVICE_ORDER_STATUS.IN_CALIBRATION]),
  orderedDate: requiredWhen<string>(isIsoDate, ORDERED_DATE_REQUIRED),
  returnedDate: forbiddenWhen(RETURNED_DATE_FORBIDDEN),
});
const returnedServiceOrderSchema = serviceOrderFieldsSchema.extend({
  status: z.literal([SERVICE_ORDER_STATUS.RETURNED, SERVICE_ORDER_STATUS.COMPLETED]),
  orderedDate: requiredWhen<string>(isIsoDate, ORDERED_DATE_REQUIRED),
  returnedDate: requiredWhen<string>(isIsoDate, '返却済以降の案件には実返却日が必要です'),
});
const cancelledServiceOrderSchema = serviceOrderFieldsSchema.extend({
  status: z.literal(SERVICE_ORDER_STATUS.CANCELLED),
});

/** status と発注日・実返却日の対応（domain-model.md §3.6） */
export const serviceOrderSchema = serviceOrderFieldsSchema.pipe(
  z.discriminatedUnion('status', [
    plannedServiceOrderSchema,
    awaitingReturnServiceOrderSchema,
    returnedServiceOrderSchema,
    cancelledServiceOrderSchema,
  ]),
);

/** 通知のフラットな属性定義（役割は serviceItemFieldsSchema と同じ） */
export const notificationFieldsSchema = z.object({
  id: requiredStringSchema,
  type: z.enum(NOTIFICATION_TYPE),
  targetType: z.enum(NOTIFICATION_TARGET_TYPE),
  targetId: requiredStringSchema,
  personId: requiredStringSchema,
  message: requiredStringSchema,
  createdDate: isoDateStringSchema,
  isRead: z.boolean(),
});

const serviceItemNotificationSchema = notificationFieldsSchema.extend({
  targetType: z.literal(NOTIFICATION_TARGET_TYPE.SERVICE_ITEM),
  type: z.enum(SERVICE_ITEM_NOTIFICATION_TYPES, '対象種別が点検校正項目の通知には使えない種別です'),
});
const serviceOrderNotificationSchema = notificationFieldsSchema.extend({
  targetType: z.literal(NOTIFICATION_TARGET_TYPE.SERVICE_ORDER),
  type: z.enum(
    SERVICE_ORDER_NOTIFICATION_TYPES,
    '対象種別が点検校正外部案件の通知には使えない種別です',
  ),
});

/** 対象種別ごとに持てる通知種別を限定する（domain-model.md §3.7） */
export const notificationSchema = notificationFieldsSchema.pipe(
  z.discriminatedUnion('targetType', [
    serviceItemNotificationSchema,
    serviceOrderNotificationSchema,
  ]),
);

/** 永続化データ全体（store.md「merge」ハッピーパスの全体 safeParse に使用） */
export const appStateSchema = z.object({
  vendors: z.record(z.string(), vendorSchema),
  persons: z.record(z.string(), personSchema),
  equipment: z.record(z.string(), equipmentSchema),
  serviceItems: z.record(z.string(), serviceItemSchema),
  serviceRecords: z.record(z.string(), serviceRecordSchema),
  serviceOrders: z.record(z.string(), serviceOrderSchema),
  notifications: z.record(z.string(), notificationSchema),
});

/**
 * スキーマと types.ts の構造一致をビルド時に強制する（coding-standards.md §3）。
 * どちらか一方だけを変更するとここがコンパイルエラーになる。
 * なぜ export か: tsconfig の noUnusedLocals で未使用ローカルが弾かれるため、
 * 検証専用の定数であることを明示しつつ export しておく。
 */
type AssertEqual<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : never
  : never;

export const schemaMatchesVendor: AssertEqual<z.infer<typeof vendorSchema>, Vendor> = true;
export const schemaMatchesPerson: AssertEqual<z.infer<typeof personSchema>, Person> = true;
export const schemaMatchesEquipment: AssertEqual<z.infer<typeof equipmentSchema>, Equipment> = true;
export const schemaMatchesServiceItem: AssertEqual<
  z.infer<typeof serviceItemSchema>,
  ServiceItem
> = true;
export const schemaMatchesServiceRecord: AssertEqual<
  z.infer<typeof serviceRecordSchema>,
  ServiceRecord
> = true;
export const schemaMatchesServiceOrder: AssertEqual<
  z.infer<typeof serviceOrderSchema>,
  ServiceOrder
> = true;
export const schemaMatchesNotification: AssertEqual<
  z.infer<typeof notificationSchema>,
  Notification
> = true;
export const schemaMatchesAppState: AssertEqual<z.infer<typeof appStateSchema>, AppState> = true;
