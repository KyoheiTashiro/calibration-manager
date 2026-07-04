/**
 * 機器新規登録画面（screen-design/03-equipment-form.md、URL `/equipment/create`）。
 * 送信ボタンは検証エラー時も無効化せず、送信試行でエラー表示する（screen-design/README.md §0.5）。
 * フィールド群は shared/FormFields.tsx（create/edit 共通）を利用する。
 */

import { Button } from "@/components/ui";
import { useCreateEquipmentForm } from "@/features/equipment/form/create/hooks";
import { EquipmentFormFields } from "@/features/equipment/form/shared/FormFields";
import type { ReactElement } from "react";

export const EquipmentCreateForm = (): ReactElement => {
  const { register, errors, onFormSubmit, manufacturerOptions, handleCancel } =
    useCreateEquipmentForm();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">機器を追加</h1>

      {/* なぜ noValidate か: 必須項目は TextField の required 属性経由でネイティブHTML5検証も
          有効になるが、本画面の検証はRHF+zodに一本化し「送信試行でエラー表示」する方針
          （screen-design/README.md §0.5）のため、ブラウザ標準の検証UIを無効化する。 */}
      <form onSubmit={onFormSubmit} noValidate className="flex max-w-xl flex-col gap-4">
        <EquipmentFormFields
          register={register}
          errors={errors}
          manufacturerOptions={manufacturerOptions}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button type="submit">保存</Button>
        </div>
      </form>
    </div>
  );
};
