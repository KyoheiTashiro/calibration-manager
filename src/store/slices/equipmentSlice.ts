/**
 * 機器スライス（store.md「スライス構成」）。
 * 機器の削除は論理削除のみ（status=retired）。suspended/retired は期限計算・通知の
 * 対象外（domain-model.md §3.3）だが、その除外は派生側（itemStatus / generateNotifications）の責務。
 */

import type { AppSliceCreator } from "@/store/storeState";
import type { Equipment, EquipmentStatus } from "@/store/types";
import { createId } from "@/utils/id";

export type EquipmentSlice = {
  equipment: Record<string, Equipment>;
  /** @returns 生成したEquipmentのid */
  addEquipment: (input: Omit<Equipment, "id">) => string;
  updateEquipment: (id: string, patch: Partial<Omit<Equipment, "id">>) => void;
  setEquipmentStatus: (id: string, status: EquipmentStatus) => void;
};

export const createEquipmentSlice: AppSliceCreator<EquipmentSlice> = (set) => ({
  equipment: {},

  addEquipment: (input): string => {
    const id = createId();
    set((state) => {
      state.equipment[id] = { ...input, id };
    });
    return id;
  },

  updateEquipment: (id, patch): void => {
    set((state) => {
      const entry = state.equipment[id];
      if (!entry) return;
      Object.assign(entry, patch);
    });
  },

  setEquipmentStatus: (id, status): void => {
    set((state) => {
      const entry = state.equipment[id];
      if (!entry) return;
      entry.status = status;
    });
  },
});
