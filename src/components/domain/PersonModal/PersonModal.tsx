/**
 * 担当者の追加/編集モーダル。
 * 削除の代わりに isActive=false への無効化を行い、無効化時は確認ダイアログを表示する。
 */

import { Schema, defaultValues, type FormType } from '@/components/domain/PersonModal/schema';
import { Button, Checkbox, ConfirmModal, Modal, TextField } from '@/components/ui';
import type { Person } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { createSaveHandler, emptyToUndefined } from '@/utils/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';

type Props = {
  open: boolean;
  person?: Person;
  onClose: () => void;
};

const toFormValues = (person?: Person): FormType =>
  person
    ? {
        name: person.name,
        email: person.email,
        department: person.department ?? '',
        isActive: person.isActive,
      }
    : defaultValues;

export const PersonModal = ({ open, person, onClose }: Props): ReactElement => {
  const addPerson = useAppStore((state) => state.addPerson);
  const updatePerson = useAppStore((state) => state.updatePerson);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormType>({
    resolver: zodResolver(Schema),
    values: toFormValues(person),
  });

  const handleClose = (): void => {
    reset();
    onClose();
  };

  /** 無効化確認待ちの保存値 */
  const [pendingDeactivation, setPendingDeactivation] = useState<FormType | null>(null);

  const savePerson = (values: FormType): void => {
    const normalized: FormType = {
      ...values,
      department: emptyToUndefined(values.department),
    };
    if (person) {
      updatePerson(person.id, normalized);
    } else {
      addPerson(normalized);
    }
    handleClose();
  };

  const onSubmit = (values: FormType): void => {
    if (person?.isActive === true && !values.isActive) {
      setPendingDeactivation(values);
      return;
    }
    savePerson(values);
  };

  const handleConfirmDeactivation = (): void => {
    if (!pendingDeactivation) return;
    savePerson(pendingDeactivation);
    setPendingDeactivation(null);
  };

  const handleCancelDeactivation = (): void => {
    setPendingDeactivation(null);
  };

  const handleSave = createSaveHandler(handleSubmit, onSubmit);

  return (
    <>
      <Modal
        open={open}
        title={person ? '担当者を編集' : '担当者を追加'}
        onClose={handleClose}
        isDirty={isDirty}
        footer={<Button onClick={handleSave}>保存</Button>}
      >
        <div className='flex flex-col gap-4'>
          <TextField label='氏名' required error={errors.name?.message} {...register('name')} />
          <TextField label='メール' required error={errors.email?.message} {...register('email')} />
          <TextField label='部署' error={errors.department?.message} {...register('department')} />
          <Checkbox label='有効' error={errors.isActive?.message} {...register('isActive')} />
        </div>
      </Modal>
      {pendingDeactivation ? (
        <ConfirmModal
          open
          title='担当者の無効化'
          message='この担当者を無効化しますか?'
          confirmLabel='無効化'
          onConfirm={handleConfirmDeactivation}
          onCancel={handleCancelDeactivation}
        />
      ) : null}
    </>
  );
};
