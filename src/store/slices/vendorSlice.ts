/**
 * removeVendor は参照整合カスケードを持つ。
 */

import { addEntity, patchEntity } from '@/store/entityActions';
import { isVendorReferenced } from '@/store/selectors';
import type { AppSliceCreator } from '@/store/storeState';
import type { Vendor } from '@/store/types';
import { recordValue } from '@/utils/record';

export type VendorSlice = {
  vendors: Record<string, Vendor>;
  /** @returns 生成したVendorのid */
  addVendor: (input: Omit<Vendor, 'id'>) => string;
  updateVendor: (id: string, patch: Partial<Omit<Vendor, 'id'>>) => void;
  /**
   * Equipment.manufacturerId / ServiceItem.vendorId / ServiceOrder.vendorId の
   * いずれかから参照されている場合は削除せず false を返す。
   * @returns 削除できたら true
   */
  removeVendor: (id: string) => boolean;
};

export const createVendorSlice: AppSliceCreator<VendorSlice> = (set, get) => ({
  vendors: {},

  addVendor: (input): string => addEntity(set, (state) => state.vendors, input),

  updateVendor: (id, patch): void => {
    patchEntity(set, (state) => state.vendors, id, patch);
  },

  removeVendor: (id): boolean => {
    const currentState = get();
    if (recordValue(currentState.vendors, id) === undefined) return false;
    if (isVendorReferenced(currentState, id)) return false;
    set((state) => {
      // 動的キーへの delete は Immer ドラフト上のエンティティ削除イディオム
      // oxlint-disable-next-line typescript/no-dynamic-delete
      delete state.vendors[id];
    });
    return true;
  },
});
