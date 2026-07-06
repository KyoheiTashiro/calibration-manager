/**
 * 項目は物理削除せず isActive で無効化する。
 */

import type { AppSliceCreator } from "@/store/storeState";
import type { ServiceItem } from "@/store/types";
import { createId } from "@/utils/id";
import { recordValue } from "@/utils/record";

export type ServiceItemSlice = {
  serviceItems: Record<string, ServiceItem>;
  /** @returns 生成したServiceItemのid */
  addServiceItem: (input: Omit<ServiceItem, "id">) => string;
  updateServiceItem: (id: string, patch: Partial<Omit<ServiceItem, "id">>) => void;
  setServiceItemActive: (id: string, isActive: boolean) => void;
};

export const createServiceItemSlice: AppSliceCreator<ServiceItemSlice> = (set) => ({
  serviceItems: {},

  addServiceItem: (input): string => {
    const id = createId();
    set((state) => {
      state.serviceItems[id] = { ...input, id };
    });
    return id;
  },

  updateServiceItem: (id, patch): void => {
    set((state) => {
      const serviceItem = recordValue(state.serviceItems, id);
      if (serviceItem === undefined) return;
      Object.assign(serviceItem, patch);
    });
  },

  setServiceItemActive: (id, isActive): void => {
    set((state) => {
      const serviceItem = recordValue(state.serviceItems, id);
      if (serviceItem === undefined) return;
      serviceItem.isActive = isActive;
    });
  },
});
