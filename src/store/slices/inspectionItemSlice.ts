/**
 * 点検校正項目スライス（store.md「スライス構成」）。
 * 項目は物理削除せず isActive で無効化する（store.md「アクション仕様」の実装判断）。
 */

import type { AppSliceCreator } from "@/store/storeState";
import type { InspectionItem } from "@/store/types";
import { createId } from "@/utils/id";

export type InspectionItemSlice = {
  items: Record<string, InspectionItem>;
  /** @returns 生成したInspectionItemのid */
  addItem: (input: Omit<InspectionItem, "id">) => string;
  updateItem: (id: string, patch: Partial<Omit<InspectionItem, "id">>) => void;
  setItemActive: (id: string, isActive: boolean) => void;
};

export const createInspectionItemSlice: AppSliceCreator<InspectionItemSlice> = (set) => ({
  items: {},

  addItem: (input): string => {
    const id = createId();
    set((state) => {
      state.items[id] = { ...input, id };
    });
    return id;
  },

  updateItem: (id, patch): void => {
    set((state) => {
      const item = state.items[id];
      if (!item) return;
      Object.assign(item, patch);
    });
  },

  setItemActive: (id, isActive): void => {
    set((state) => {
      const item = state.items[id];
      if (!item) return;
      item.isActive = isActive;
    });
  },
});
