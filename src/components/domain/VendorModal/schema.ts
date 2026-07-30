/**
 * VendorModal のフォームスキーマ（RHF + zodResolver 用）。
 * 入力体験向けの厳密検証（email形式・0以上の数値等）はここで担う。
 * 永続化データの構造検証は `src/store/schema.ts` の vendorSchema が別途担う。
 *
 * なぜフォーム値をすべて string ベースに保つか: HTML input の値は本質的に文字列であり、
 * `standardLeadTimeDays` も number へ変換するのは検証成功後（呼び出し側の submit ハンドラ）に限る。
 * これにより defaultValues/reset に渡す型と register 対象の型を一致させ、
 * preprocess/transform による resolver の入出力型ズレを避ける。
 */

import { PHONE_PATTERN, TEXT_LIMIT } from '@/constants/textLimits';
import { maxLengthMessage } from '@/utils/form';
import { z } from 'zod';

export const Schema = z.object({
  name: z
    .string()
    .min(1, '名称は必須です')
    .max(TEXT_LIMIT.name, maxLengthMessage('名称', TEXT_LIMIT.name)),
  isManufacturer: z.boolean(),
  isCalibrator: z.boolean(),
  contactPerson: z
    .string()
    .max(TEXT_LIMIT.name, maxLengthMessage('窓口担当者', TEXT_LIMIT.name))
    .optional(),
  email: z
    .string()
    .max(TEXT_LIMIT.email, maxLengthMessage('メールアドレス', TEXT_LIMIT.email))
    .optional()
    .refine((value) => value === undefined || value === '' || z.email().safeParse(value).success, {
      message: 'メールアドレスの形式が不正です',
    }),
  phone: z
    .string()
    .max(TEXT_LIMIT.code, maxLengthMessage('電話番号', TEXT_LIMIT.code))
    .optional()
    .refine((value) => value === undefined || value === '' || PHONE_PATTERN.test(value), {
      message: '電話番号は半角数字またはハイフンで入力してください',
    }),
  standardLeadTimeDays: z
    .string()
    .optional()
    .refine(
      (value) =>
        value === undefined || value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      {
        message: '0以上の数値を入力してください',
      },
    ),
  note: z.string().max(TEXT_LIMIT.note, maxLengthMessage('備考', TEXT_LIMIT.note)).optional(),
});

export type FormType = z.infer<typeof Schema>;

export const defaultValues: FormType = {
  name: '',
  isManufacturer: false,
  isCalibrator: false,
  contactPerson: '',
  email: '',
  phone: '',
  standardLeadTimeDays: '',
  note: '',
};
