/**
 * 機器編集画面（screen-design/03-equipment-form.md、URL `/equipment/:id/edit`）。
 * 送信ボタンは検証エラー時も無効化せず、送信試行でエラー表示する（screen-design/README.md §0.5）。
 * 「廃棄にする」は破壊的操作のため ConfirmModal で確認する（README §0.6）。
 * フィールド群は shared/FormFields.tsx（create/edit 共通）を利用する。
 */

import { Button, ConfirmModal } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useEditEquipmentForm } from "@/features/equipment/form/edit/hooks";
import { EquipmentFormFields } from "@/features/equipment/form/shared/FormFields";
import { createFormSubmitHandler } from "@/utils/form";
import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";

export const EquipmentEditForm = (): ReactElement => {
  const {
    shouldRedirectToList,
    register,
    errors,
    onFormSubmit,
    manufacturerOptions,
    retireConfirmOpen,
    openRetireConfirm,
    closeRetireConfirm,
    handleRetireConfirm,
    handleCancel,
  } = useEditEquipmentForm();

  // なぜ: 編集対象が存在しない（dangling id・URL直打ち等）場合は一覧へリダイレクトする
  // （タスク仕様。domain-model.md の「dangling FKでもユーザーデータは保持」とは別軸の、
  // 画面パラメータ不正時のガード）。
  if (shouldRedirectToList) {
    return <Navigate to={ROUTES.EQUIPMENT_LIST} replace />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">機器を編集</h1>

      {/* なぜ noValidate か: 必須項目は TextField の required 属性経由でネイティブHTML5検証も
          有効になるが、本画面の検証はRHF+zodに一本化し「送信試行でエラー表示」する方針
          （screen-design/README.md §0.5）のため、ブラウザ標準の検証UIを無効化する。 */}
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

        <div className="flex items-center justify-between pt-2">
          <div>
            <Button type="button" variant="danger" onClick={openRetireConfirm}>
              廃棄にする
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button type="submit">保存</Button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={retireConfirmOpen}
        title="機器の廃棄"
        message="この機器を廃棄にしますか?"
        confirmLabel="廃棄"
        onConfirm={handleRetireConfirm}
        onCancel={closeRetireConfirm}
      />
    </div>
  );
};
