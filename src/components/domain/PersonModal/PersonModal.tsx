/**
 * 担当者の追加/編集モーダル（screen-design/09-masters.md §9-B）。
 * 削除の代わりに isActive=false への無効化を行い、有効な ServiceItem に
 * 割り当てられている場合は確認ダイアログで警告する（README.md §0.6 の確認ダイアログポリシー）。
 */

import { Schema, defaultValues, type FormType } from "@/components/domain/PersonModal/schema";
import { Button, Checkbox, ConfirmModal, Modal, TextField } from "@/components/ui";
import type { Person } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { createSaveHandler, emptyToUndefined } from "@/utils/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";

type PersonModalProps = {
  open: boolean;
  person?: Person;
  onClose: () => void;
};

const toFormValues = (person?: Person): FormType =>
  person
    ? {
        name: person.name,
        email: person.email,
        department: person.department ?? "",
        isActive: person.isActive,
      }
    : defaultValues;

/** 無効化確認待ちの状態。確定時に使う保存値と、警告文に埋め込む割り当て件数を保持する */
type PendingDeactivation = {
  values: FormType;
  assignedServiceItemCount: number;
};

export const PersonModal = ({ open, person, onClose }: PersonModalProps): ReactElement => {
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

  // なぜ close 時に reset() を呼ぶか: values オプションは内容が変わらない限り reset しないため、
  // 同一対象を dirty のまま破棄クローズ→再オープンした場合に入力が残留してしまう。
  // close 時に明示的に reset()(引数なし)を呼び、最新の defaultValues(values由来)へ戻す。
  const handleClose = (): void => {
    reset();
    onClose();
  };

  const [pendingDeactivation, setPendingDeactivation] = useState<PendingDeactivation | null>(null);

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

  // なぜ getState() で件数を都度取得するか: 送信時点でしか使わない値を毎レンダー購読するのを
  // 避けるため（coding-standards.md §5「1値1呼び出しで分割購読」の趣旨に沿ったスナップショット取得）。
  const onSubmit = (values: FormType): void => {
    if (person?.isActive === true && !values.isActive) {
      const assignedServiceItemCount = Object.values(useAppStore.getState().serviceItems).filter(
        (serviceItem) => serviceItem.personId === person.id && serviceItem.isActive,
      ).length;
      setPendingDeactivation({ values, assignedServiceItemCount });
      return;
    }
    savePerson(values);
  };

  const handleConfirmDeactivation = (): void => {
    if (!pendingDeactivation) return;
    savePerson(pendingDeactivation.values);
    setPendingDeactivation(null);
  };

  const handleCancelDeactivation = (): void => {
    setPendingDeactivation(null);
  };

  const handleSave = createSaveHandler(handleSubmit, onSubmit);

  const confirmMessage =
    pendingDeactivation && pendingDeactivation.assignedServiceItemCount > 0
      ? `この担当者は現役の点検校正項目 ${pendingDeactivation.assignedServiceItemCount} 件に割り当てられています。通知が届かなくなる可能性があります。無効化しますか?`
      : "この担当者を無効化しますか?";

  return (
    <>
      <Modal
        open={open}
        title={person ? "担当者を編集" : "担当者を追加"}
        onClose={handleClose}
        isDirty={isDirty}
        footer={<Button onClick={handleSave}>保存</Button>}
      >
        <div className="flex flex-col gap-4">
          <TextField label="氏名" required error={errors.name?.message} {...register("name")} />
          <TextField label="メール" required error={errors.email?.message} {...register("email")} />
          <TextField label="部署" error={errors.department?.message} {...register("department")} />
          <Checkbox label="有効" error={errors.isActive?.message} {...register("isActive")} />
        </div>
      </Modal>
      {pendingDeactivation ? (
        <ConfirmModal
          open
          title="担当者の無効化"
          message={confirmMessage}
          confirmLabel="無効化"
          onConfirm={handleConfirmDeactivation}
          onCancel={handleCancelDeactivation}
        />
      ) : null}
    </>
  );
};
