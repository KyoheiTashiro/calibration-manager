import { ControlledSelect, Textarea, TextField } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { statusOptions, type SelectOption } from '@/features/equipment/form/shared/mapping';
import type { FormType } from '@/features/equipment/form/shared/schema';
import type { ReactElement } from 'react';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Link } from 'react-router-dom';

type Props = {
  register: UseFormRegister<FormType>;
  errors: FieldErrors<FormType>;
  control: Control<FormType>;
  manufacturerOptions: SelectOption[];
};

export const EquipmentFormFields = ({
  register,
  errors,
  control,
  manufacturerOptions,
}: Props): ReactElement => (
  <>
    <TextField
      label='管理番号'
      required
      error={errors.managementNo?.message}
      {...register('managementNo')}
    />
    <TextField label='機器名' required error={errors.name?.message} {...register('name')} />
    <TextField label='型式' error={errors.model?.message} {...register('model')} />
    <TextField label='シリアル番号' error={errors.serialNo?.message} {...register('serialNo')} />
    {manufacturerOptions.length === 0 ? (
      <div>
        <span className='block text-sm text-slate-700'>メーカー</span>
        <p className='text-sm text-slate-600'>
          メーカーが未登録です。メーカー/取引先一覧から追加してください
          <Link to={ROUTES.VENDOR_LIST} className='text-primary ml-1 underline'>
            メーカー/取引先一覧へ
          </Link>
        </p>
      </div>
    ) : (
      <ControlledSelect
        control={control}
        name='manufacturerId'
        label='メーカー'
        placeholder='選択してください'
        options={manufacturerOptions}
        error={errors.manufacturerId?.message}
      />
    )}
    <TextField label='設置場所' error={errors.location?.message} {...register('location')} />
    <ControlledSelect
      control={control}
      name='status'
      label='状態'
      required
      options={statusOptions}
      error={errors.status?.message}
    />
    <Textarea label='備考' error={errors.note?.message} {...register('note')} />
  </>
);
