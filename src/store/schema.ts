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
  type CalibrationOrder,
  CYCLE,
  type Equipment,
  EQUIPMENT_STATUS,
  EXECUTION,
  type InspectionItem,
  type InspectionRecord,
  INSPECTION_ITEM_TYPE,
  NOTIFICATION_TARGET_TYPE,
  NOTIFICATION_TYPE,
  type Notification,
  ORDER_STATUS,
  type Person,
  RECORD_RESULT,
  type Vendor,
} from "@/store/types";
import { isIsoDateString } from "@/utils/time";
import { z } from "zod";

/** `YYYY-MM-DD` かつ暦上妥当な日付のみ許可（screen-design/README.md §0.4） */
const isoDateStringSchema = z
  .string()
  .refine(isIsoDateString, { message: "YYYY-MM-DD形式の日付ではありません" });

/** 空文字を許可しない必須文字列（名称・IDなど） */
const requiredStringSchema = z.string().min(1);

/** 日数（納期・余裕日数など）。負の日数はドメイン上あり得ない */
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

export const inspectionItemSchema = z
  .object({
    id: requiredStringSchema,
    equipmentId: requiredStringSchema,
    type: z.enum(INSPECTION_ITEM_TYPE),
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
  })
  // なぜ superRefine か: 「external の場合 vendorId 必須」（domain-model.md §3.4）は
  // 型では表現していない相関制約のため、スキーマ側で強制する。
  .superRefine((inspectionItem, context) => {
    if (inspectionItem.execution === EXECUTION.EXTERNAL && (inspectionItem.vendorId ?? "") === "") {
      context.addIssue({
        code: "custom",
        path: ["vendorId"],
        message: "外部実施の項目には校正依頼先が必要です",
      });
    }
  });

export const inspectionRecordSchema = z.object({
  id: requiredStringSchema,
  inspectionItemId: requiredStringSchema,
  doneDate: isoDateStringSchema,
  doneBy: requiredStringSchema,
  result: z.enum(RECORD_RESULT),
  orderId: z.string().optional(),
  note: z.string().optional(),
});

export const calibrationOrderSchema = z.object({
  id: requiredStringSchema,
  inspectionItemId: requiredStringSchema,
  vendorId: requiredStringSchema,
  status: z.enum(ORDER_STATUS),
  orderedDate: isoDateStringSchema.optional(),
  dueDate: isoDateStringSchema.optional(),
  returnedDate: isoDateStringSchema.optional(),
  cost: z.number().nonnegative().optional(),
  note: z.string().optional(),
});

export const notificationSchema = z.object({
  id: requiredStringSchema,
  type: z.enum(NOTIFICATION_TYPE),
  targetType: z.enum(NOTIFICATION_TARGET_TYPE),
  targetId: requiredStringSchema,
  personId: requiredStringSchema,
  message: requiredStringSchema,
  createdDate: isoDateStringSchema,
  isRead: z.boolean(),
});

/** 永続化データ全体（store.md「merge」ハッピーパスの全体 safeParse に使用） */
export const appStateSchema = z.object({
  vendors: z.record(z.string(), vendorSchema),
  persons: z.record(z.string(), personSchema),
  equipment: z.record(z.string(), equipmentSchema),
  inspectionItems: z.record(z.string(), inspectionItemSchema),
  records: z.record(z.string(), inspectionRecordSchema),
  orders: z.record(z.string(), calibrationOrderSchema),
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
export const schemaMatchesInspectionItem: AssertEqual<
  z.infer<typeof inspectionItemSchema>,
  InspectionItem
> = true;
export const schemaMatchesInspectionRecord: AssertEqual<
  z.infer<typeof inspectionRecordSchema>,
  InspectionRecord
> = true;
export const schemaMatchesCalibrationOrder: AssertEqual<
  z.infer<typeof calibrationOrderSchema>,
  CalibrationOrder
> = true;
export const schemaMatchesNotification: AssertEqual<
  z.infer<typeof notificationSchema>,
  Notification
> = true;
export const schemaMatchesAppState: AssertEqual<z.infer<typeof appStateSchema>, AppState> = true;
