/**
 * PersonModal のフォームスキーマ（RHF + zodResolver 用）。
 * 入力体験向けの厳密検証（email形式等）はここで担う。
 * 永続化データの構造検証は `src/store/schema.ts` の personSchema が別途担う。
 */

import { TEXT_LIMIT } from '@/constants/textLimits';
import { maxLengthMessage } from '@/utils/form';
import { z } from 'zod';

export const Schema = z.object({
  name: z
    .string()
    .min(1, '氏名は必須です')
    .max(TEXT_LIMIT.name, maxLengthMessage('氏名', TEXT_LIMIT.name)),
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .max(TEXT_LIMIT.email, maxLengthMessage('メールアドレス', TEXT_LIMIT.email))
    .refine((value) => z.email().safeParse(value).success, {
      message: 'メールアドレスの形式が不正です',
    }),
  department: z.string().max(TEXT_LIMIT.name, maxLengthMessage('部署', TEXT_LIMIT.name)).optional(),
  isActive: z.boolean(),
});

export type FormType = z.infer<typeof Schema>;

/**
 * なぜ新規追加時の isActive 既定値を true にするか: ドメイン仕様書に明記はないが、
 * 「無効な担当者を新規作成する」のは通常運用として不自然であり、既存 Person 一覧の
 * 運用（有効が既定）と整合させるための実装判断。
 */
export const defaultValues: FormType = {
  name: '',
  email: '',
  department: '',
  isActive: true,
};
