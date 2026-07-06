import { EQUIPMENT_STATUS_LABELS } from "@/features/equipment/constants";
import type { FormType } from "@/features/equipment/form/shared/schema";
import type { Equipment } from "@/store/types";

export type SelectOption = { value: string; label: string };

export const statusOptions: SelectOption[] = Object.entries(EQUIPMENT_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const toEquipmentPayload = (values: FormType): Omit<Equipment, "id"> => ({
  managementNo: values.managementNo,
  name: values.name,
  model: values.model === "" ? undefined : values.model,
  serialNo: values.serialNo === "" ? undefined : values.serialNo,
  manufacturerId: values.manufacturerId === "" ? undefined : values.manufacturerId,
  location: values.location === "" ? undefined : values.location,
  status: values.status,
  note: values.note === "" ? undefined : values.note,
});
