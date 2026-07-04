/**
 * 機器登録・編集フォーム（create/edit 共通）の RHF+zodResolver 状態管理フック
 * （screen-design/03-equipment-form.md）。UI（create/edit の index.tsx）を薄いビューに保つため
 * 切り出す（coding-standards.md §2）。
 */

import type { SelectOption } from "@/features/equipment/form/shared/mapping";
import {
  createEquipmentFormSchema,
  type EquipmentFormValues,
} from "@/features/equipment/form/shared/schema";
import { useAppStore } from "@/store/useAppStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormHandleSubmit,
  type UseFormRegister,
  type UseFormReset,
} from "react-hook-form";

type UseEquipmentFormCoreParams = {
  defaultValues: EquipmentFormValues;
  /** 編集時: 管理番号ユニーク検証から自身を除外するための機器 id。新規時は undefined */
  excludeEquipmentId?: string;
};

type UseEquipmentFormCoreResult = {
  register: UseFormRegister<EquipmentFormValues>;
  errors: FieldErrors<EquipmentFormValues>;
  handleSubmit: UseFormHandleSubmit<EquipmentFormValues>;
  reset: UseFormReset<EquipmentFormValues>;
  manufacturerOptions: SelectOption[];
};

export const useEquipmentFormCore = ({
  defaultValues,
  excludeEquipmentId,
}: UseEquipmentFormCoreParams): UseEquipmentFormCoreResult => {
  const equipmentMap = useAppStore((state) => state.equipment);
  const vendors = useAppStore((state) => state.vendors);

  // なぜ: ユニーク検証は「自身以外」の管理番号一覧を対象にする（編集時に自身の値を再送信しても
  // エラーにしないため）。新規時は excludeEquipmentId が undefined なので誰も除外されない。
  const existingManagementNumbers = useMemo(
    () =>
      Object.values(equipmentMap)
        .filter((entry) => entry.id !== excludeEquipmentId)
        .map((entry) => entry.managementNo),
    [equipmentMap, excludeEquipmentId],
  );

  // なぜ Object.values(vendors) を useMemo 内で算出するか: vendors オブジェクト自体を
  // 依存配列に入れれば、ストアが実際に変わらない限り Object.values の再生成は起きず
  // resolver も不要に再生成されない（manufacturerOptions と同じパターン）。
  const resolver = useMemo(
    () => zodResolver(createEquipmentFormSchema(existingManagementNumbers, Object.values(vendors))),
    [existingManagementNumbers, vendors],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EquipmentFormValues>({
    resolver,
    defaultValues,
  });

  const manufacturerOptions = Object.values(vendors)
    .filter((vendor) => vendor.isManufacturer)
    .toSorted((left, right) => left.name.localeCompare(right.name, "ja"))
    .map((vendor) => ({ value: vendor.id, label: vendor.name }));

  return { register, errors, handleSubmit, reset, manufacturerOptions };
};
