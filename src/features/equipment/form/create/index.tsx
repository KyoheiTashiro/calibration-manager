import { Button } from "@/components/ui";
import { useCreateEquipmentForm } from "@/features/equipment/form/create/hooks";
import { EquipmentFormFields } from "@/features/equipment/form/shared/FormFields";
import { createFormSubmitHandler } from "@/utils/form";
import type { ReactElement } from "react";

export const EquipmentCreateForm = (): ReactElement => {
  const { register, errors, onFormSubmit, manufacturerOptions, handleCancel } =
    useCreateEquipmentForm();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">機器を追加</h1>

      {/* なぜ noValidate か: 必須項目は TextField の required 属性経由でネイティブHTML5検証も
          有効になるが、本画面の検証はRHF+zodに一本化し「送信試行でエラー表示」する方針のため、
          ブラウザ標準の検証UIを無効化する。 */}
      <form
        onSubmit={createFormSubmitHandler(onFormSubmit)}
        noValidate
        className="flex max-w-xl flex-col gap-4"
      >
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
