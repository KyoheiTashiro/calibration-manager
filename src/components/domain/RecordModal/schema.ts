/**
 * RecordModal のフォームスキーマ（RHF + zodResolver 用、screen-design/07-record-modal.md）。
 * 入力体験向けの検証（必須・日付形式・結果 enum）をここで担う。
 * 永続化データの構造検証は `src/store/schema.ts` の serviceRecordSchema が別途担う
 * （coding-standards.md §3）。
 *
 * なぜフォーム値をすべて string ベースに保つか: HTML input/radio の値は本質的に文字列であり、
 * defaultValues/reset に渡す型と register 対象の型を一致させ、preprocess/transform による
 * resolver の入出力型ズレを避ける（ServiceItemModal/schema.ts と同方針）。
 */

import { RECORD_RESULT } from "@/store/types";
import { isIsoDateString } from "@/utils/time";
import { z } from "zod";

export const recordFormSchema = z.object({
  doneDate: z
    .string()
    .min(1, "実施日は必須です")
    .refine(isIsoDateString, { message: "実施日の形式が不正です" }),
  doneBy: z.string().min(1, "実施者は必須です"),
  // なぜ error パラメータで日本語文言か: 既定選択なし（未選択）で送信された場合も
  // この enum 検証に失敗し、統一した必須メッセージを返すため（07-record-modal.md）。
  result: z.enum(RECORD_RESULT, { error: "結果を選択してください" }),
  note: z.string().optional(),
});

export type RecordFormValues = z.infer<typeof recordFormSchema>;
