/**
 * メーカー/取引先スライス（store.md「スライス構成」）。
 * removeVendor は参照整合カスケード（store.md「アクション仕様」）を持つ。
 */

import type { AppSliceCreator } from "@/store/storeState";
import type { Vendor } from "@/store/types";
import { createId } from "@/utils/id";
import { recordValue } from "@/utils/record";

export type VendorSlice = {
  vendors: Record<string, Vendor>;
  /** @returns 生成したVendorのid */
  addVendor: (input: Omit<Vendor, "id">) => string;
  updateVendor: (id: string, patch: Partial<Omit<Vendor, "id">>) => void;
  /**
   * Equipment.manufacturerId / InspectionItem.vendorId / CalibrationOrder.vendorId の
   * いずれかから参照されている場合は削除せず false を返す（store.md「アクション仕様」）。
   * @returns 削除できたら true
   */
  removeVendor: (id: string) => boolean;
};

export const createVendorSlice: AppSliceCreator<VendorSlice> = (set, get) => ({
  vendors: {},

  addVendor: (input): string => {
    const id = createId();
    set((state) => {
      state.vendors[id] = { ...input, id };
    });
    return id;
  },

  updateVendor: (id, patch): void => {
    set((state) => {
      const vendor = state.vendors[id];
      if (!vendor) return;
      Object.assign(vendor, patch);
    });
  },

  removeVendor: (id): boolean => {
    const { vendors, equipment, inspectionItems, orders } = get();
    if (recordValue(vendors, id) === undefined) return false;
    const isReferenced =
      Object.values(equipment).some((entry) => entry.manufacturerId === id) ||
      Object.values(inspectionItems).some((entry) => entry.vendorId === id) ||
      Object.values(orders).some((entry) => entry.vendorId === id);
    if (isReferenced) return false;
    set((state) => {
      // 動的キーへの delete は Immer ドラフト上のエンティティ削除イディオム（coding-standards.md §5）
      // oxlint-disable-next-line typescript/no-dynamic-delete
      delete state.vendors[id];
    });
    return true;
  },
});
