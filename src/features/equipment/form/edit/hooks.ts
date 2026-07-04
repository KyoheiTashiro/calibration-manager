/**
 * 機器編集画面（screen-design/03-equipment-form.md、URL `/equipment/:id/edit`）の状態管理フック。
 * フォーム状態そのものは shared/useFormCore.ts の useEquipmentFormCore に委譲し、
 * プリフィル・保存後の遷移・廃棄確認フローのみここで扱う。
 */

import { equipmentDetailPath } from "@/constants/routes";
import { toEquipmentPayload, type SelectOption } from "@/features/equipment/form/shared/mapping";
import {
  emptyFormValues,
  type EquipmentFormValues,
} from "@/features/equipment/form/shared/schema";
import { useEquipmentFormCore } from "@/features/equipment/form/shared/useFormCore";
import { EQUIPMENT_STATUS, type Equipment } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useState } from "react";
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

  const { register, errors, handleSubmit, reset, manufacturerOptions } = useEquipmentFormCore({
    defaultValues: toFormValues(currentEquipment),
    excludeEquipmentId: id,
  });

  // なぜ: 編集対象（currentEquipment）が変わるたびに既存値をプリフィルする
  // （screen-design/README.md §0.5「対象を編集する場合は既存値をプリフィルする」と同方針）。
  useEffect(() => {
    reset(toFormValues(currentEquipment));
  }, [currentEquipment, reset]);

  const onSubmit = (values: EquipmentFormValues): void => {
    if (currentEquipment === undefined) return;
    updateEquipment(currentEquipment.id, toEquipmentPayload(values));
    navigate(equipmentDetailPath(currentEquipment.id));
  };

  const handleRetireConfirm = (): void => {
    if (currentEquipment === undefined) return;
    setEquipmentStatus(currentEquipment.id, EQUIPMENT_STATUS.RETIRED);
    setRetireConfirmOpen(false);
    navigate(equipmentDetailPath(currentEquipment.id));
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
    openRetireConfirm: (): void => setRetireConfirmOpen(true),
    closeRetireConfirm: (): void => setRetireConfirmOpen(false),
    handleRetireConfirm,
    handleCancel: (): void => {
      navigate(-1);
    },
  };
};
