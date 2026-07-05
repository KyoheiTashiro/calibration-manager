/**
 * ServiceOrderModal のフォームスキーマ（RHF + zodResolver 用、screen-design/08-service-orders.md「案件作成モーダル」）。
 * 入力体験向けの厳密検証（日付形式・0以上の数値等）はここで担う。
 * 永続化データの構造検証は `src/store/schema.ts` の serviceOrderSchema が別途担う
 * （coding-standards.md §3）。
 *
 * なぜフォーム値をすべて string ベースに保つか: ServiceItemModal/schema.ts と同方針。cost を number へ
 * 変換するのは検証成功後（呼び出し側の submit ハンドラ）に限る。
 */

import { optionalNonNegativeIntegerString } from "@/utils/form";
import { isIsoDateString } from "@/utils/time";
import { z } from "zod";

export const Schema = z.object({
  vendorId: z.string().min(1, "校正依頼先を選択してください"),
  dueDate: z
    .string()
    .optional()
    .refine((value) => value === undefined || value === "" || isIsoDateString(value), {
      message: "返却予定日の形式が不正です",
    }),
  cost: optionalNonNegativeIntegerString("費用は0以上の数値で入力してください"),
  note: z.string().optional(),
});

export type FormType = z.infer<typeof Schema>;

/** 新規作成時の既定フォーム値。vendorId は呼び出し側で serviceItem.vendorId から解決して上書きする */
export const defaultValues: FormType = {
  vendorId: "",
  dueDate: "",
  cost: "",
  note: "",
};
