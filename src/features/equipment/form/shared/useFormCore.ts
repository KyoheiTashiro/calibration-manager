/**
 * 機器登録・編集フォーム（create/edit 共通）の RHF+zodResolver 状態管理フック
 * （screen-design/03-equipment-form.md）。UI（create/edit の index.tsx）を薄いビューに保つため
 * 切り出す（coding-standards.md §2）。
 */

import type { SelectOption } from "@/features/equipment/form/shared/mapping";
import { createSchema, type FormType } from "@/features/equipment/form/shared/schema";
import { useAppStore } from "@/store/useAppStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormHandleSubmit,
  type UseFormRegister,
} from "react-hook-form";

type UseEquipmentFormCoreParams = {
  defaultValues: FormType;
  /**
   * 編集対象の最新値。指定時は RHF の values として渡す。深い等価比較で変化を検知した際に
   * reset + defaultValues 更新が行われるため、対象切り替え時のみプリフィルし直す用途に使う
   * （新規作成では指定しない＝undefined）。
   */
  values?: FormType;
  /** 編集時: 管理番号ユニーク検証から自身を除外するための機器 id。新規時は undefined */
  excludeEquipmentId?: string;
};

type UseEquipmentFormCoreResult = {
  register: UseFormRegister<FormType>;
  errors: FieldErrors<FormType>;
  handleSubmit: UseFormHandleSubmit<FormType>;
  manufacturerOptions: SelectOption[];
};

export const useEquipmentFormCore = ({
  defaultValues,
  values,
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
  // resolver も不要に再生成されない。
  const resolver = useMemo(
    () => zodResolver(createSchema(existingManagementNumbers, Object.values(vendors))),
    [existingManagementNumbers, vendors],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormType>({
    resolver,
    defaultValues,
    values,
  });

  const manufacturerOptions = Object.values(vendors)
    .filter((vendor) => vendor.isManufacturer)
    .toSorted((left, right) => left.name.localeCompare(right.name, "ja"))
    .map((vendor) => ({ value: vendor.id, label: vendor.name }));

  return { register, errors, handleSubmit, manufacturerOptions };
};
