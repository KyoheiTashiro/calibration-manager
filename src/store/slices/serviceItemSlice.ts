/**
 * 項目は物理削除せず isActive で無効化する。
 */

import { addEntity, patchEntity } from '@/store/entityActions';
import type { AppSliceCreator } from '@/store/storeState';
import type { ServiceItem } from '@/store/types';

export type ServiceItemSlice = {
  serviceItems: Record<string, ServiceItem>;
  /** @returns 生成したServiceItemのid */
  addServiceItem: (input: Omit<ServiceItem, 'id'>) => string;
  updateServiceItem: (id: string, patch: Partial<Omit<ServiceItem, 'id'>>) => void;
};

export const createServiceItemSlice: AppSliceCreator<ServiceItemSlice> = (set) => ({
  serviceItems: {},

  addServiceItem: (input): string => addEntity(set, (state) => state.serviceItems, input),

  updateServiceItem: (id, patch): void => {
    patchEntity(set, (state) => state.serviceItems, id, patch);
  },
});
