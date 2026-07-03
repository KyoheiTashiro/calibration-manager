/**
 * EquipmentForm のフォームスキーマ（RHF + zodResolver 用、screen-design/03-equipment-form.md）。
 * 入力体験向けの厳密検証（管理番号のユニークチェック等）はここで担う。
 * 永続化データの構造検証は `src/store/schema.ts` の equipmentSchema が別途担う（coding-standards.md §3）。
 *
 * なぜフォーム値をすべて string ベースに保つか: HTML input/select の値は本質的に文字列であり、
 * defaultValues/reset に渡す型と register 対象の型を一致させ、preprocess/transform による
 * resolver の入出力型ズレを避ける（vendorFormSchema と同方針）。
 *
 * なぜ managementNo のユニークチェックを呼び出し側でスキーマ生成する形にするか: 自身以外の
 * Equipment.managementNo 一覧はストアの状態（レンダー時点）に依存するため、コンポーネント側で
 * `Object.values(equipment)` から算出し `createEquipmentFormSchema(existingManagementNumbers)` に
 * 渡す。編集モードでは自身の managementNo を除外した一覧を渡すことで自己参照時のエラーを避ける。
 */

import { EQUIPMENT_STATUS } from "@/store/types";
import { z } from "zod";

// なぜ戻り値の型注釈を付けないか: z.infer<ReturnType<typeof createEquipmentFormSchema>> で
// フォーム値の型を導出するため、戻り値をワイドな型（ZodType等）で注釈すると refine 等による
// 具体的なスキーマ形状が失われ z.infer が正しく推論できなくなる。そのため戻り値型は
// TypeScript の推論に委ね、explicit-function-return-type 系ルールをこの関数に限り無効化する。
// oxlint-disable-next-line typescript/explicit-function-return-type, typescript/explicit-module-boundary-types -- 上記理由によりzodスキーマの戻り値型は推論に委ねる必要がある
export const createEquipmentFormSchema = (existingManagementNumbers: string[]) =>
  z.object({
    managementNo: z
      .string()
      .min(1, "管理番号は必須です")
      .refine((value) => !existingManagementNumbers.includes(value), {
        message: "この管理番号は既に使用されています",
      }),
    name: z.string().min(1, "機器名は必須です"),
    model: z.string().optional(),
    serialNo: z.string().optional(),
    manufacturerId: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(EQUIPMENT_STATUS),
    note: z.string().optional(),
  });

export type EquipmentFormValues = z.infer<ReturnType<typeof createEquipmentFormSchema>>;
