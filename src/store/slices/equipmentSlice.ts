/**
 * 機器の削除は論理削除のみ（status=retired）。suspended/retired は期限計算・通知の
 * 対象外だが、その除外は派生側（serviceItemStatus / generateNotifications）の責務。
 */

import { addEntity, patchEntity } from '@/store/entityActions';
import type { AppSliceCreator } from '@/store/storeState';
import type { Equipment } from '@/store/types';

export type EquipmentSlice = {
  equipment: Record<string, Equipment>;
  /** @returns 生成したEquipmentのid */
  addEquipment: (input: Omit<Equipment, 'id'>) => string;
  updateEquipment: (id: string, patch: Partial<Omit<Equipment, 'id'>>) => void;
};

export const createEquipmentSlice: AppSliceCreator<EquipmentSlice> = (set) => ({
  equipment: {},

  addEquipment: (input): string => addEntity(set, (state) => state.equipment, input),

  updateEquipment: (id, patch): void => {
    patchEntity(set, (state) => state.equipment, id, patch);
  },
});
