/**
 * ItemModal のフォームスキーマ（RHF + zodResolver 用、screen-design/06-item-modal.md）。
 * 入力体験向けの厳密検証（0以上の整数・日付形式等）はここで担う。
 * 永続化データの構造検証は `src/store/schema.ts` の inspectionItemSchema が別途担う（coding-standards.md §3）。
 *
 * なぜフォーム値をすべて string ベースに保つか: HTML input/select の値は本質的に文字列であり、
 * leadTimeDays/bufferDays/noticeDaysBefore も number へ変換するのは検証成功後（呼び出し側の
 * submit ハンドラ）に限る。defaultValues/reset に渡す型と register 対象の型を一致させ、
 * preprocess/transform による resolver の入出力型ズレを避ける（vendorFormSchema と同方針）。
 */

import { DEFAULT_BUFFER_DAYS, DEFAULT_NOTICE_DAYS_BEFORE } from "@/domain/constants";
import { CYCLE, EXECUTION, ITEM_TYPE } from "@/store/types";
import { isIsoDateString } from "@/utils/time";
import { z } from "zod";

/** 空欄不可・0以上の整数文字列（発注余裕日・通知開始日数向け） */
// なぜ戻り値の型注釈を付けないか: equipment/form/schema.ts の createEquipmentFormSchema と同じ理由で、
// refine() 済みの具体的なZodスキーマ形状をTypeScriptの推論に委ねる必要があるため。
// oxlint-disable-next-line typescript/explicit-function-return-type, typescript/explicit-module-boundary-types -- 上記理由によりzodスキーマの戻り値型は推論に委ねる必要がある
const requiredNonNegativeIntegerString = (requiredMessage: string, invalidMessage: string) =>
  z
    .string()
    .min(1, requiredMessage)
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
      message: invalidMessage,
    });

/** 空欄可・0以上の整数文字列（納期(日)向け） */
// oxlint-disable-next-line typescript/explicit-function-return-type, typescript/explicit-module-boundary-types -- 上記理由によりzodスキーマの戻り値型は推論に委ねる必要がある
const optionalNonNegativeIntegerString = (invalidMessage: string) =>
  z
    .string()
    .optional()
    .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), {
      message: invalidMessage,
    });

export const itemFormSchema = z
  .object({
    name: z.string().min(1, "項目名は必須です"),
    type: z.enum(ITEM_TYPE),
    cycle: z.enum(CYCLE),
    execution: z.enum(EXECUTION),
    vendorId: z.string().optional(),
    leadTimeDays: optionalNonNegativeIntegerString("納期(日)は0以上の整数で入力してください"),
    bufferDays: requiredNonNegativeIntegerString(
      "発注余裕日は必須です",
      "発注余裕日は0以上の整数で入力してください",
    ),
    personId: z.string().min(1, "担当者は必須です"),
    noticeDaysBefore: requiredNonNegativeIntegerString(
      "通知開始日数は必須です",
      "通知開始日数は0以上の整数で入力してください",
    ),
    nextDueDate: z
      .string()
      .min(1, "次回期限は必須です")
      .refine(isIsoDateString, { message: "次回期限の形式が不正です" }),
    isActive: z.boolean(),
  })
  // なぜ superRefine か: 「external の場合 vendorId 必須」（06-item-modal.md）は
  // 型では表現していない相関制約のため、スキーマ側で強制する（store/schema.ts の
  // inspectionItemSchema と同方針）。
  .superRefine((values, context) => {
    if (values.execution === EXECUTION.EXTERNAL && (values.vendorId ?? "") === "") {
      context.addIssue({
        code: "custom",
        path: ["vendorId"],
        message: "校正依頼先を選択してください",
      });
    }
  });

export type ItemFormValues = z.infer<typeof itemFormSchema>;

/** 新規追加時の既定フォーム値（06-item-modal.md「新規フォーム既定値」） */
export const defaultItemFormValues: ItemFormValues = {
  name: "",
  type: ITEM_TYPE.INSPECTION,
  cycle: CYCLE.Y1,
  execution: EXECUTION.INTERNAL,
  vendorId: "",
  leadTimeDays: "",
  bufferDays: String(DEFAULT_BUFFER_DAYS),
  personId: "",
  noticeDaysBefore: String(DEFAULT_NOTICE_DAYS_BEFORE),
  nextDueDate: "",
  isActive: true,
};
