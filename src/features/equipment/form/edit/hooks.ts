/**
 * 機器編集画面（screen-design/03-equipment-form.md、URL `/equipment/:id/edit`）の状態管理フック。
 * フォーム状態そのものは shared/useFormCore.ts の useEquipmentFormCore に委譲し、
 * プリフィル・保存後の遷移・廃棄確認フローのみここで扱う。
 */

import { equipmentDetailPath } from "@/constants/routes";
import { toEquipmentPayload, type SelectOption } from "@/features/equipment/form/shared/mapping";
import { emptyFormValues, type EquipmentFormValues } from "@/features/equipment/form/shared/schema";
import { useEquipmentFormCore } from "@/features/equipment/form/shared/useFormCore";
import { EQUIPMENT_STATUS, type Equipment } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useState } from "react";
import type { FieldErrors, UseFormHandleSubmit, UseFormRegister } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

// なぜ undefined を許容するか: Rules of Hooks により対象不在（dangling id・URL直打ち等）でも
// フックは無条件に実行されるため、currentEquipment が undefined の場合のフォールバック
// （新規時と同じ emptyFormValues）を用意しておく必要がある。
const toFormValues = (equipment: Equipment | undefined): EquipmentFormValues =>
  equipment
    ? {
        managementNo: equipment.managementNo,
        name: equipment.name,
        model: equipment.model ?? "",
        serialNo: equipment.serialNo ?? "",
        manufacturerId: equipment.manufacturerId ?? "",
        location: equipment.location ?? "",
        status: equipment.status,
        note: equipment.note ?? "",
      }
    : emptyFormValues;

type UseEditEquipmentFormResult = {
  /** 編集対象機器が存在しない（dangling id・URL直打ち等）場合 true。一覧へリダイレクトする */
  shouldRedirectToList: boolean;
  register: UseFormRegister<EquipmentFormValues>;
  errors: FieldErrors<EquipmentFormValues>;
  onFormSubmit: ReturnType<UseFormHandleSubmit<EquipmentFormValues>>;
  manufacturerOptions: SelectOption[];
  retireConfirmOpen: boolean;
  openRetireConfirm: () => void;
  closeRetireConfirm: () => void;
  handleRetireConfirm: () => void;
  handleCancel: () => void;
};

export const useEditEquipmentForm = (): UseEditEquipmentFormResult => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const equipmentMap = useAppStore((state) => state.equipment);
  const updateEquipment = useAppStore((state) => state.updateEquipment);
  const setEquipmentStatus = useAppStore((state) => state.setEquipmentStatus);

  const currentEquipment = id === undefined ? undefined : equipmentMap[id];

  const [retireConfirmOpen, setRetireConfirmOpen] = useState(false);

  const currentFormValues = toFormValues(currentEquipment);

  // なぜ values を渡すか: 編集画面はルートページで対象（currentEquipment）が変わる場合のみ
  // 内容を更新すればよい。RHF の values は深い等価比較で変化を検知した際に reset +
  // defaultValues 更新を行うため、対象切り替え時のみプリフィルし直す従来の挙動を維持できる
  // （screen-design/README.md §0.5「対象を編集する場合は既存値をプリフィルする」と同方針）。
  // defaultValues は初回マウント時（currentEquipment 未確定タイミング含む）用に残す。
  const { register, errors, handleSubmit, manufacturerOptions } = useEquipmentFormCore({
    defaultValues: currentFormValues,
    values: currentFormValues,
    excludeEquipmentId: id,
  });

  const onSubmit = (values: EquipmentFormValues): void => {
    if (currentEquipment === undefined) return;
    updateEquipment(currentEquipment.id, toEquipmentPayload(values));
    // なぜ Promise.resolve().catch() か: navigate() は react-router 7 で
    // `void | Promise<void>` を返す。遷移完了を待つ必要はなく、失敗時も
    // 画面表示に影響しないため、両方の戻り値を統一的に無視する。
    Promise.resolve(navigate(equipmentDetailPath(currentEquipment.id))).catch(() => {
      // 遷移エラーは無視する
    });
  };

  const handleRetireConfirm = (): void => {
    if (currentEquipment === undefined) return;
    setEquipmentStatus(currentEquipment.id, EQUIPMENT_STATUS.RETIRED);
    setRetireConfirmOpen(false);
    Promise.resolve(navigate(equipmentDetailPath(currentEquipment.id))).catch(() => {
      // 遷移エラーは無視する
    });
  };

  return {
    // なぜ: 編集対象が存在しない（dangling id・URL直打ち等）場合は一覧へリダイレクトする
    // （タスク仕様。domain-model.md の「dangling FKでもユーザーデータは保持」とは別軸の、
    // 画面パラメータ不正時のガード）。
    shouldRedirectToList: currentEquipment === undefined,
    register,
    errors,
    onFormSubmit: handleSubmit(onSubmit),
    manufacturerOptions,
    retireConfirmOpen,
    openRetireConfirm: (): void => {
      setRetireConfirmOpen(true);
    },
    closeRetireConfirm: (): void => {
      setRetireConfirmOpen(false);
    },
    handleRetireConfirm,
    handleCancel: (): void => {
      Promise.resolve(navigate(-1)).catch(() => {
        // 遷移エラーは無視する
      });
    },
  };
};
