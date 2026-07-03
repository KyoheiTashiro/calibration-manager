/**
 * OrderModal のフォームスキーマ（RHF + zodResolver 用、screen-design/08-orders.md「案件作成モーダル」）。
 * 入力体験向けの厳密検証（日付形式・0以上の数値等）はここで担う。
 * 永続化データの構造検証は `src/store/schema.ts` の calibrationOrderSchema が別途担う
 * （coding-standards.md §3）。
 *
 * なぜフォーム値をすべて string ベースに保つか: InspectionItemModal/schema.ts と同方針。cost を number へ
 * 変換するのは検証成功後（呼び出し側の submit ハンドラ）に限る。共有ヘルパー抽出は今回のタスク
 * 範囲外のため、optionalNonNegativeIntegerString は独立して再実装する。
 */

import { isIsoDateString } from "@/utils/time";
import { z } from "zod";

/** 空欄可・0以上の整数文字列（費用向け） */
// なぜ戻り値の型注釈を付けないか: InspectionItemModal/schema.ts の同名ヘルパーと同じ理由で、
// refine() 済みの具体的なZodスキーマ形状をTypeScriptの推論に委ねる必要があるため。
// oxlint-disable-next-line typescript/explicit-function-return-type, typescript/explicit-module-boundary-types -- 上記理由によりzodスキーマの戻り値型は推論に委ねる必要がある
const optionalNonNegativeIntegerString = (invalidMessage: string) =>
  z
    .string()
    .optional()
    .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), {
      message: invalidMessage,
    });

export const orderFormSchema = z.object({
  vendorId: z.string().min(1, "依頼先を選択してください"),
  dueDate: z
    .string()
    .optional()
    .refine((value) => !value || isIsoDateString(value), {
      message: "返却予定日の形式が不正です",
    }),
  cost: optionalNonNegativeIntegerString("費用は0以上の数値で入力してください"),
  note: z.string().optional(),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

/** 新規作成時の既定フォーム値。vendorId は呼び出し側で inspectionItem.vendorId から解決して上書きする */
export const defaultOrderFormValues: OrderFormValues = {
  vendorId: "",
  dueDate: "",
  cost: "",
  note: "",
};
