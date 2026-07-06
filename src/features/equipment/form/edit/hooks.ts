import { equipmentDetailPath } from "@/constants/routes";
import { toEquipmentPayload, type SelectOption } from "@/features/equipment/form/shared/mapping";
import { defaultValues, type FormType } from "@/features/equipment/form/shared/schema";
import { useEquipmentFormCore } from "@/features/equipment/form/shared/useFormCore";
import { EQUIPMENT_STATUS, type Equipment } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useSafeNavigate } from "@/utils/navigation";
import { useState } from "react";
import type { FieldErrors, UseFormHandleSubmit, UseFormRegister } from "react-hook-form";
import { useParams } from "react-router-dom";

// なぜ undefined を許容するか: Rules of Hooks により対象不在（dangling id・URL直打ち等）でも
// フックは無条件に実行されるため、currentEquipment が undefined の場合のフォールバック
// （新規時と同じ defaultValues）を用意しておく必要がある。
const toFormValues = (equipment: Equipment | undefined): FormType =>
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
    : defaultValues;

type UseEditEquipmentFormResult = {
  shouldRedirectToList: boolean;
  register: UseFormRegister<FormType>;
  errors: FieldErrors<FormType>;
  onFormSubmit: ReturnType<UseFormHandleSubmit<FormType>>;
  manufacturerOptions: SelectOption[];
  retireConfirmOpen: boolean;
  openRetireConfirm: () => void;
  closeRetireConfirm: () => void;
  handleRetireConfirm: () => void;
  handleCancel: () => void;
};

export const useEditEquipmentForm = (): UseEditEquipmentFormResult => {
  const { id } = useParams<{ id: string }>();
  const safeNavigate = useSafeNavigate();

  const equipmentMap = useAppStore((state) => state.equipment);
  const updateEquipment = useAppStore((state) => state.updateEquipment);
  const setEquipmentStatus = useAppStore((state) => state.setEquipmentStatus);

  const currentEquipment = id === undefined ? undefined : equipmentMap[id];

  const [retireConfirmOpen, setRetireConfirmOpen] = useState(false);

  const currentFormValues = toFormValues(currentEquipment);

  // 編集画面はルートページで対象（currentEquipment）が変わる場合のみ内容を更新すればよいため
  // values を渡す。defaultValues は初回マウント時（currentEquipment 未確定タイミング含む）用に残す。
  const { register, errors, handleSubmit, manufacturerOptions } = useEquipmentFormCore({
    defaultValues: currentFormValues,
    values: currentFormValues,
    excludeEquipmentId: id,
  });

  const onSubmit = (values: FormType): void => {
    if (currentEquipment === undefined) return;
    updateEquipment(currentEquipment.id, toEquipmentPayload(values));
    safeNavigate(equipmentDetailPath(currentEquipment.id));
  };

  const handleRetireConfirm = (): void => {
    if (currentEquipment === undefined) return;
    setEquipmentStatus(currentEquipment.id, EQUIPMENT_STATUS.RETIRED);
    setRetireConfirmOpen(false);
    safeNavigate(equipmentDetailPath(currentEquipment.id));
  };

  return {
    // 編集対象が存在しない（dangling id・URL直打ち等）場合は一覧へリダイレクトする
    // （domain-model.md の「dangling FKでもユーザーデータは保持」とは別軸の、画面パラメータ不正時のガード）。
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
      safeNavigate(-1);
    },
  };
};
