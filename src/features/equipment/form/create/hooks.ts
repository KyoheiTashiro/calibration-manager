import { equipmentDetailPath } from "@/constants/routes";
import { toEquipmentPayload, type SelectOption } from "@/features/equipment/form/shared/mapping";
import { defaultValues, type FormType } from "@/features/equipment/form/shared/schema";
import { useEquipmentFormCore } from "@/features/equipment/form/shared/useFormCore";
import { useAppStore } from "@/store/useAppStore";
import { useSafeNavigate } from "@/utils/navigation";
import type { FieldErrors, UseFormHandleSubmit, UseFormRegister } from "react-hook-form";

type UseCreateEquipmentFormResult = {
  register: UseFormRegister<FormType>;
  errors: FieldErrors<FormType>;
  onFormSubmit: ReturnType<UseFormHandleSubmit<FormType>>;
  manufacturerOptions: SelectOption[];
  handleCancel: () => void;
};

export const useCreateEquipmentForm = (): UseCreateEquipmentFormResult => {
  const safeNavigate = useSafeNavigate();
  const addEquipment = useAppStore((state) => state.addEquipment);

  const { register, errors, handleSubmit, manufacturerOptions } = useEquipmentFormCore({
    defaultValues,
  });

  const onSubmit = (values: FormType): void => {
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
