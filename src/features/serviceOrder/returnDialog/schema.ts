/**
 * 返却ダイアログ（inCalibration → returned、screen-design/08-service-orders.md）のフォームスキーマ
 * （RHF + zodResolver）。日付整合（orderedDate ≤ returnedDate）は警告表示のみでブロックしない（D-019）
 * ため zod では扱わずコンポーネント側で判定する。
 */

import { isIsoDateString } from "@/utils/time";
import { z } from "zod";

export const Schema = z.object({
  returnedDate: z
    .string()
    .min(1, "実返却日は必須です")
    .refine(isIsoDateString, { message: "実返却日の形式が不正です" }),
});
export type FormType = z.infer<typeof Schema>;
