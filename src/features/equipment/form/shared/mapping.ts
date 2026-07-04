/**
 * 機器登録・編集フォーム（create/edit 共通）のセレクト選択肢・ストア入力変換
 * （screen-design/03-equipment-form.md）。
 */

import { EQUIPMENT_STATUS_LABELS } from "@/features/equipment/constants";
import type { EquipmentFormValues } from "@/features/equipment/form/shared/schema";
import type { Equipment } from "@/store/types";

export type SelectOption = { value: string; label: string };

export const statusOptions: SelectOption[] = Object.entries(EQUIPMENT_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

/** フォーム値(string ベース)をストア入力へ変換。空文字の任意項目は undefined に落とす */
export const toEquipmentPayload = (values: EquipmentFormValues): Omit<Equipment, "id"> => ({
  managementNo: values.managementNo,
  name: values.name,
  model: values.model === "" ? undefined : values.model,
  serialNo: values.serialNo === "" ? undefined : values.serialNo,
  manufacturerId: values.manufacturerId === "" ? undefined : values.manufacturerId,
  location: values.location === "" ? undefined : values.location,
  status: values.status,
  note: values.note === "" ? undefined : values.note,
});
