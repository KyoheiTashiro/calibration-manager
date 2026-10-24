import { EQUIPMENT_STATUS_LABELS } from '@/features/equipment/constants';
import type { FormType } from '@/features/equipment/form/shared/schema';
import type { Equipment } from '@/store/types';
import { emptyToUndefined } from '@/utils/form';

export type SelectOption = { value: string; label: string };

export const statusOptions: SelectOption[] = Object.entries(EQUIPMENT_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const toEquipmentPayload = (values: FormType): Omit<Equipment, 'id'> => ({
  managementNo: values.managementNo,
  name: values.name,
  model: emptyToUndefined(values.model),
  serialNo: emptyToUndefined(values.serialNo),
  manufacturerId: emptyToUndefined(values.manufacturerId),
  location: emptyToUndefined(values.location),
  status: values.status,
  note: emptyToUndefined(values.note),
});
