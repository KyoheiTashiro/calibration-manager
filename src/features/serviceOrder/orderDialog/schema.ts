/**
 * 発注ダイアログ（planned → ordered、screen-design/08-service-orders.md）のフォームスキーマ
 * （RHF + zodResolver）。日付整合（orderedDate ≤ dueDate）は警告表示のみでブロックしない（D-019）ため
 * zod では扱わずコンポーネント側で判定する。
 *
 * なぜフォーム値を string ベースに保つか: HTML input の値は本質的に文字列であり、number への変換は
 * 検証成功後（submit ハンドラ）に限る。ServiceItemModal / schema.ts と同方針。
 */

import { isIsoDateString } from "@/utils/time";
import { z } from "zod";

export const Schema = z.object({
  orderedDate: z
    .string()
    .min(1, "発注日は必須です")
    .refine(isIsoDateString, { message: "発注日の形式が不正です" }),
  dueDate: z.string().refine((value) => value === "" || isIsoDateString(value), {
    message: "返却予定日の形式が不正です",
  }),
  // なぜ整数限定か: D-021。ServiceOrderModal(案件作成)の費用検証と粒度を統一する。
  cost: z
    .string()
    .refine((value) => value === "" || (Number.isInteger(Number(value)) && Number(value) >= 0), {
      message: "費用は0以上の数値で入力してください",
    }),
});
export type FormType = z.infer<typeof Schema>;

/** 新規作成時の既定フォーム値。orderedDate は呼び出し側で todayIsoDate() を上書きする */
export const defaultValues: FormType = {
  orderedDate: "",
  dueDate: "",
  cost: "",
};
