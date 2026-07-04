/**
 * 機器新規登録画面（screen-design/03-equipment-form.md、URL `/equipment/create`）の状態管理フック。
 * フォーム状態そのものは shared/useFormCore.ts の useEquipmentFormCore に委譲し、
 * 保存後の遷移・キャンセルのみここで扱う。
 */

import { equipmentDetailPath } from "@/constants/routes";
import { toEquipmentPayload, type SelectOption } from "@/features/equipment/form/shared/mapping";
import { emptyFormValues, type EquipmentFormValues } from "@/features/equipment/form/shared/schema";
import { useEquipmentFormCore } from "@/features/equipment/form/shared/useFormCore";
import { useAppStore } from "@/store/useAppStore";
import { useSafeNavigate } from "@/utils/navigation";
import type { FieldErrors, UseFormHandleSubmit, UseFormRegister } from "react-hook-form";

type UseCreateEquipmentFormResult = {
  register: UseFormRegister<EquipmentFormValues>;
  errors: FieldErrors<EquipmentFormValues>;
  onFormSubmit: ReturnType<UseFormHandleSubmit<EquipmentFormValues>>;
  manufacturerOptions: SelectOption[];
  handleCancel: () => void;
};

export const useCreateEquipmentForm = (): UseCreateEquipmentFormResult => {
  const safeNavigate = useSafeNavigate();
  const addEquipment = useAppStore((state) => state.addEquipment);

  const { register, errors, handleSubmit, manufacturerOptions } = useEquipmentFormCore({
    defaultValues: emptyFormValues,
  });

  const onSubmit = (values: EquipmentFormValues): void => {
    const newId = addEquipment(toEquipmentPayload(values));
    safeNavigate(equipmentDetailPath(newId));
  };

  return {
    register,
    errors,
    onFormSubmit: handleSubmit(onSubmit),
    manufacturerOptions,
    handleCancel: (): void => {
      safeNavigate(-1);
    },
  };
};
