// oxlint-disable import/max-dependencies -- 7スライス+永続化を合成するルートのため依存数上限の対象外とする
/**
 * アプリ全状態を保持する単一 zustand ストア（store.md）。
 * ミドルウェア順は persist(immer(...))（coding-standards.md §5）。
 * 読込パイプライン: LocalStorage → migrate → merge（3段サルベージ）→ ストア。
 */

import { STORAGE_KEY, STORAGE_VERSION } from "@/constants/storage";
import { emptyAppState, migratePersistedState, salvagePersistedState } from "@/store/persistence";
import { createCalibrationOrderSlice } from "@/store/slices/calibrationOrderSlice";
import { createEquipmentSlice } from "@/store/slices/equipmentSlice";
import { createInspectionItemSlice } from "@/store/slices/inspectionItemSlice";
import { createInspectionRecordSlice } from "@/store/slices/inspectionRecordSlice";
import { createNotificationSlice } from "@/store/slices/notificationSlice";
import { createPersonSlice } from "@/store/slices/personSlice";
import { createVendorSlice } from "@/store/slices/vendorSlice";
import type { StoreState } from "@/store/storeState";
import type { AppState } from "@/store/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/** 永続化対象は7エンティティの Record のみ（store.md「partialize」） */
const partializeAppState = (state: StoreState): AppState => ({
  vendors: state.vendors,
  persons: state.persons,
  equipment: state.equipment,
  items: state.items,
  records: state.records,
  orders: state.orders,
  notifications: state.notifications,
});

export const useAppStore = create<StoreState>()(
  persist(
    immer((set, get, api) => ({
      ...createVendorSlice(set, get, api),
      ...createPersonSlice(set, get, api),
      ...createEquipmentSlice(set, get, api),
      ...createInspectionItemSlice(set, get, api),
      ...createInspectionRecordSlice(set, get, api),
      ...createCalibrationOrderSlice(set, get, api),
      ...createNotificationSlice(set, get, api),
      resetAll: (): void => {
        set((state) => {
          Object.assign(state, emptyAppState());
        });
      },
      replaceEntities: (key, entities): void => {
        set((state) => {
          // 検証済みデータでの全置換（D-029）。キー1つ分のみ更新するため Partial を合成する
          Object.assign(state, { [key]: entities });
        });
      },
    })),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      partialize: partializeAppState,
      // migrate の戻りはこの時点では未検証データ。検証・救済は merge が担うため、
      // ここでの型主張は「後段が必ず検証する」前提の受け渡しに過ぎない。
      migrate: (persisted, fromVersion) =>
        migratePersistedState(persisted, fromVersion) as AppState,
      merge: (persisted, current) => ({ ...current, ...salvagePersistedState(persisted) }),
    },
  ),
);
