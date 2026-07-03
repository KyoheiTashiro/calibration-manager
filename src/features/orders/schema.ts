/**
 * 校正案件かんばんの遷移ダイアログ用フォームスキーマ（RHF + zodResolver、screen-design/08-orders.md）。
 * 形式検証（必須・YYYY-MM-DD・0以上数値）はここで担いブロックする。日付整合（orderedDate ≤ dueDate 等）は
 * 警告表示のみでブロックしない（decisions.md D-019）ため zod では扱わずコンポーネント側で判定する。
 *
 * なぜフォーム値を string ベースに保つか: HTML input の値は本質的に文字列であり、number への変換は
 * 検証成功後（submit ハンドラ）に限る。InspectionItemModal / schema.ts と同方針。
 */

import { isIsoDateString } from "@/utils/time";
import { z } from "zod";

/** 発注ダイアログ（planned → ordered）。orderedDate 必須、dueDate・cost 任意 */
export const orderDialogSchema = z.object({
  orderedDate: z
    .string()
    .min(1, "発注日は必須です")
    .refine(isIsoDateString, { message: "発注日の形式が不正です" }),
  dueDate: z.string().refine((value) => value === "" || isIsoDateString(value), {
    message: "返却予定日の形式が不正です",
  }),
  // なぜ整数限定か: D-021。OrderModal(案件作成)の費用検証と粒度を統一する。
  cost: z
    .string()
    .refine((value) => value === "" || (Number.isInteger(Number(value)) && Number(value) >= 0), {
      message: "費用は0以上の数値で入力してください",
    }),
});
export type OrderDialogValues = z.infer<typeof orderDialogSchema>;

/** 返却ダイアログ（inCalibration → returned）。returnedDate 必須 */
export const returnDialogSchema = z.object({
  returnedDate: z
    .string()
    .min(1, "実返却日は必須です")
    .refine(isIsoDateString, { message: "実返却日の形式が不正です" }),
});
export type ReturnDialogValues = z.infer<typeof returnDialogSchema>;
