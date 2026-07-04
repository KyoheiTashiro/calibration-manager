/**
 * 機器登録・編集フォーム（create/edit 共通）のフィールド群（screen-design/03-equipment-form.md）。
 * 管理番号〜備考の8項目を純粋ビューとして提供する。`<form>` タグ・ボタン群は含めない
 * （ページ側の責務）。
 */

import { Select, Textarea, TextField } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { statusOptions, type SelectOption } from "@/features/equipment/form/shared/mapping";
import type { EquipmentFormValues } from "@/features/equipment/form/shared/schema";
import type { ReactElement } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Link } from "react-router-dom";

type Props = {
  register: UseFormRegister<EquipmentFormValues>;
  errors: FieldErrors<EquipmentFormValues>;
  manufacturerOptions: SelectOption[];
};

export const EquipmentFormFields = ({
  register,
  errors,
  manufacturerOptions,
}: Props): ReactElement => (
  <>
    <TextField
      label="管理番号"
      required
      error={errors.managementNo?.message}
      {...register("managementNo")}
    />
    <TextField label="機器名" required error={errors.name?.message} {...register("name")} />
    <TextField label="型式" error={errors.model?.message} {...register("model")} />
    <TextField label="シリアル番号" error={errors.serialNo?.message} {...register("serialNo")} />
    {manufacturerOptions.length === 0 ? (
      <div>
        <span className="block text-sm text-slate-700">メーカー</span>
        <p className="text-sm text-slate-600">
          メーカーが未登録です。マスタから追加してください
          <Link to={ROUTES.VENDOR_LIST} className="text-primary ml-1 underline">
            メーカーマスタへ
          </Link>
        </p>
      </div>
    ) : (
      <Select
        label="メーカー"
        placeholder="選択してください"
        options={manufacturerOptions}
        error={errors.manufacturerId?.message}
        {...register("manufacturerId")}
      />
    )}
    <TextField label="設置場所" error={errors.location?.message} {...register("location")} />
    <Select
      label="状態"
      required
      options={statusOptions}
      error={errors.status?.message}
      {...register("status")}
    />
    <Textarea label="備考" error={errors.note?.message} {...register("note")} />
  </>
);
