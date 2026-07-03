/**
 * PersonModal のフォームスキーマ（RHF + zodResolver 用、screen-design/09-masters.md §9-B）。
 * 入力体験向けの厳密検証（email形式等）はここで担う。
 * 永続化データの構造検証は `src/store/schema.ts` の personSchema が別途担う（coding-standards.md §3）。
 */

import { z } from "zod";

export const personFormSchema = z.object({
  name: z.string().min(1, "氏名は必須です"),
  email: z
    .string()
    .min(1, "メールアドレスは必須です")
    .pipe(z.email({ message: "メールアドレスの形式が不正です" })),
  department: z.string().optional(),
  isActive: z.boolean(),
});

export type PersonFormValues = z.infer<typeof personFormSchema>;
