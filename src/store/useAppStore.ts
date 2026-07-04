// oxlint-disable import/max-dependencies -- 7スライス+永続化を合成するルートのため依存数上限の対象外とする
/**
 * アプリ全状態を保持する単一 zustand ストア（store.md）。
 * ミドルウェア順は persist(immer(...))（coding-standards.md §5）。
 * 読込パイプライン: LocalStorage → migrate → merge（3段サルベージ）→ ストア。
 */

import { STORAGE_KEY, STORAGE_VERSION } from "@/constants/storage";
import { emptyAppState, migratePersistedState, salvagePersistedState } from "@/store/persistence";
import { createEquipmentSlice } from "@/store/slices/equipmentSlice";
import { createNotificationSlice } from "@/store/slices/notificationSlice";
import { createPersonSlice } from "@/store/slices/personSlice";
import { createServiceItemSlice } from "@/store/slices/serviceItemSlice";
import { createServiceOrderSlice } from "@/store/slices/serviceOrderSlice";
import { createServiceRecordSlice } from "@/store/slices/serviceRecordSlice";
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
  serviceItems: state.serviceItems,
  records: state.records,
  serviceOrders: state.serviceOrders,
  notifications: state.notifications,
});

export const useAppStore = create<StoreState>()(
  persist(
    immer((set, get, api) => ({
      ...createVendorSlice(set, get, api),
      ...createPersonSlice(set, get, api),
      ...createEquipmentSlice(set, get, api),
      ...createServiceItemSlice(set, get, api),
      ...createServiceRecordSlice(set, get, api),
      ...createServiceOrderSlice(set, get, api),
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
      // migrate はバージョン変換のみ担い、戻り値はこの時点では未検証データ（unknown）。
      // persist の型定義上 migrate は PersistedState（＝AppState）を返す必要があるため、
      // unknown→AppState の危険なアサーションを避け、ここで salvagePersistedState を通して
      // 型を確定させる。merge は自分に渡された値（＝ここでの戻り値）に対して再度
      // salvagePersistedState を適用するが、既に検証済みの AppState を safeParse するのは
      // 冪等（成功しそのまま通る）なため、二重適用しても実行結果は変わらない。
      migrate: (persisted, fromVersion) =>
        salvagePersistedState(migratePersistedState(persisted, fromVersion)),
      merge: (persisted, current) => ({ ...current, ...salvagePersistedState(persisted) }),
    },
  ),
);
