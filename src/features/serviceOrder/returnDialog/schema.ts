/**
 * 返却ダイアログ（inCalibration → returned、screen-design/08-service-orders.md）のフォームスキーマ
 * （RHF + zodResolver）。形式検証（必須・YYYY-MM-DD）はここで担いブロックする。日付整合
 * （orderedDate ≤ returnedDate）は警告表示のみでブロックしない（D-019）ため zod では扱わず
 * コンポーネント側で判定する。
 */

import { isIsoDateString } from "@/utils/time";
import { z } from "zod";

/** returnedDate 必須 */
export const Schema = z.object({
  returnedDate: z
    .string()
    .min(1, "実返却日は必須です")
    .refine(isIsoDateString, { message: "実返却日の形式が不正です" }),
});
export type FormType = z.infer<typeof Schema>;
