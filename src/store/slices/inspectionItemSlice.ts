/**
 * 点検校正項目スライス（store.md「スライス構成」）。
 * 項目は物理削除せず isActive で無効化する（store.md「アクション仕様」の実装判断）。
 */

import type { AppSliceCreator } from "@/store/storeState";
import type { InspectionItem } from "@/store/types";
import { createId } from "@/utils/id";
import { recordValue } from "@/utils/record";

export type InspectionItemSlice = {
  inspectionItems: Record<string, InspectionItem>;
  /** @returns 生成したInspectionItemのid */
  addInspectionItem: (input: Omit<InspectionItem, "id">) => string;
  updateInspectionItem: (id: string, patch: Partial<Omit<InspectionItem, "id">>) => void;
  setInspectionItemActive: (id: string, isActive: boolean) => void;
};

export const createInspectionItemSlice: AppSliceCreator<InspectionItemSlice> = (set) => ({
  inspectionItems: {},

  addInspectionItem: (input): string => {
    const id = createId();
    set((state) => {
      state.inspectionItems[id] = { ...input, id };
    });
    return id;
  },

  updateInspectionItem: (id, patch): void => {
    set((state) => {
      const inspectionItem = recordValue(state.inspectionItems, id);
      if (inspectionItem === undefined) return;
      Object.assign(inspectionItem, patch);
    });
  },

  setInspectionItemActive: (id, isActive): void => {
    set((state) => {
      const inspectionItem = recordValue(state.inspectionItems, id);
      if (inspectionItem === undefined) return;
      inspectionItem.isActive = isActive;
    });
  },
});
