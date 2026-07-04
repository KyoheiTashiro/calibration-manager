/**
 * 担当者の追加/編集モーダル（screen-design/09-masters.md §9-B）。
 * 削除の代わりに isActive=false への無効化を行い、有効な InspectionItem に
 * 割り当てられている場合は確認ダイアログで警告する（README.md §0.6 の確認ダイアログポリシー）。
 */

import { personFormSchema, type PersonFormValues } from "@/components/domain/PersonModal/schema";
import { Button, Checkbox, ConfirmModal, Modal, TextField } from "@/components/ui";
import type { Person } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";

type PersonModalProps = {
  open: boolean;
  person?: Person;
  onClose: () => void;
};

/**
 * なぜ新規追加時の isActive 既定値を true にするか: ドメイン仕様書に明記はないが、
 * 「無効な担当者を新規作成する」のは通常運用として不自然であり、既存 Person 一覧の
 * 運用（有効が既定）と整合させるための実装判断（Phase 4 実装時の判断）。
 */
const buildDefaultValues = (person?: Person): PersonFormValues => ({
  name: person?.name ?? "",
  email: person?.email ?? "",
  department: person?.department ?? "",
  isActive: person?.isActive ?? true,
});

/** 無効化確認待ちの状態。確定時に使う保存値と、警告文に埋め込む割り当て件数を保持する */
type PendingDeactivation = {
  values: PersonFormValues;
  assignedInspectionItemCount: number;
};

export const PersonModal = ({ open, person, onClose }: PersonModalProps): ReactElement => {
  const addPerson = useAppStore((state) => state.addPerson);
  const updatePerson = useAppStore((state) => state.updatePerson);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    values: buildDefaultValues(person),
  });

  // なぜ close 時に reset() を呼ぶか: values オプションは内容が変わらない限り reset しないため、
  // 同一対象を dirty のまま破棄クローズ→再オープンした場合に入力が残留してしまう。
  // close 時に明示的に reset()(引数なし)を呼び、最新の defaultValues(values由来)へ戻す。
  const handleClose = (): void => {
    reset();
    onClose();
  };

  const [pendingDeactivation, setPendingDeactivation] = useState<PendingDeactivation | null>(null);

  const savePerson = (values: PersonFormValues): void => {
    const normalized: PersonFormValues = {
      ...values,
      department: values.department === "" ? undefined : values.department,
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
  const onSubmit = (values: PersonFormValues): void => {
    if (person?.isActive === true && !values.isActive) {
      const assignedInspectionItemCount = Object.values(
        useAppStore.getState().inspectionItems,
      ).filter(
        (inspectionItem) => inspectionItem.personId === person.id && inspectionItem.isActive,
      ).length;
      setPendingDeactivation({ values, assignedInspectionItemCount });
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

  // なぜcatchで終端するか: no-void下でfloating promiseを残さないため(onSubmitは例外を投げない設計)。
  const handleSave = (): void => {
    handleSubmit(onSubmit)().catch(() => {
      // onSubmitは例外を投げない設計のため到達しない想定
    });
  };

  const confirmMessage =
    pendingDeactivation && pendingDeactivation.assignedInspectionItemCount > 0
      ? `この担当者は現役の点検校正項目 ${pendingDeactivation.assignedInspectionItemCount} 件に割り当てられています。通知が届かなくなる可能性があります。無効化しますか?`
      : "この担当者を無効化しますか?";

  return (
    <>
      <Modal
        open={open}
        title={person ? "担当者を編集" : "担当者を追加"}
        onClose={handleClose}
        isDirty={isDirty}
        footer={
          <Button type="button" onClick={handleSave}>
            保存
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="氏名"
            required
            error={errors.name?.message}
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("name")}
          />
          <TextField
            label="メール"
            required
            error={errors.email?.message}
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("email")}
          />
          <TextField
            label="部署"
            error={errors.department?.message}
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("department")}
          />
          <Checkbox
            label="有効"
            error={errors.isActive?.message}
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("isActive")}
          />
        </div>
      </Modal>
      {pendingDeactivation ? (
        <ConfirmModal
          open
          title="担当者の無効化"
          message={confirmMessage}
          confirmLabel="無効化"
          danger
          onConfirm={handleConfirmDeactivation}
          onCancel={handleCancelDeactivation}
        />
      ) : null}
    </>
  );
};
