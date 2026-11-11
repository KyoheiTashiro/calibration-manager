import { Button, Checkbox, ConfirmModal } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useEditEquipmentForm } from '@/features/equipment/form/edit/hooks';
import { EquipmentFormFields } from '@/features/equipment/form/shared/FormFields';
import { createFormSubmitHandler } from '@/utils/form';
import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

export const EquipmentEditForm = (): ReactElement => {
  const {
    shouldRedirectToList,
    register,
    errors,
    control,
    onFormSubmit,
    manufacturerOptions,
    retireConfirmOpen,
    retireActiveServiceOrderCount,
    cancelServiceOrdersOnRetire,
    setCancelServiceOrdersOnRetire,
    closeRetireConfirm,
    handleRetireConfirm,
    handleCancel,
  } = useEditEquipmentForm();

  if (shouldRedirectToList) {
    return <Navigate to={ROUTES.EQUIPMENT_LIST} replace />;
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-xl font-bold'>機器を編集</h1>

      {/* なぜ noValidate か: 必須項目は TextField の required 属性経由でネイティブHTML5検証も
          有効になるが、本画面の検証はRHF+zodに一本化し「送信試行でエラー表示」する方針のため、
          ブラウザ標準の検証UIを無効化する。 */}
      <form
        onSubmit={createFormSubmitHandler(onFormSubmit)}
        noValidate
        className='flex max-w-xl flex-col gap-4'
      >
        <EquipmentFormFields
          register={register}
          errors={errors}
          control={control}
          manufacturerOptions={manufacturerOptions}
        />

        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='secondary' onClick={handleCancel}>
            キャンセル
          </Button>
          <Button type='submit'>保存</Button>
        </div>
      </form>

      <ConfirmModal
        open={retireConfirmOpen}
        title='機器の廃棄'
        message={
          retireActiveServiceOrderCount === 0
            ? 'この機器を廃棄にして保存しますか?'
            : `この機器を廃棄にして保存しますか? 進行中の点検校正外部案件が${retireActiveServiceOrderCount}件あります。残した案件は廃棄後もボードに表示されますが、納期の通知は出ません。`
        }
        confirmLabel='廃棄'
        onConfirm={handleRetireConfirm}
        onCancel={closeRetireConfirm}
      >
        {retireActiveServiceOrderCount === 0 ? null : (
          <Checkbox
            label='進行中の案件も中止する'
            checked={cancelServiceOrdersOnRetire}
            onChange={(event) => {
              setCancelServiceOrdersOnRetire(event.target.checked);
            }}
          />
        )}
      </ConfirmModal>
    </div>
  );
};
