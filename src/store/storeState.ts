/**
 * ストア全体の型（store.md「スライス構成」）。
 * 7スライスの合成 + resetAll。値の実体は useAppStore.ts が合成する。
 * スライス実装とは型のみの相互参照であり、実行時の循環importは発生しない。
 */

import type { ServiceOrderSlice } from "@/store/slices/serviceOrderSlice";
import type { EquipmentSlice } from "@/store/slices/equipmentSlice";
import type { ServiceItemSlice } from "@/store/slices/serviceItemSlice";
import type { ServiceRecordSlice } from "@/store/slices/serviceRecordSlice";
import type { NotificationSlice } from "@/store/slices/notificationSlice";
import type { PersonSlice } from "@/store/slices/personSlice";
import type { VendorSlice } from "@/store/slices/vendorSlice";
import type { AppState } from "@/store/types";
import type { StateCreator } from "zustand";

export type StoreState = VendorSlice &
  PersonSlice &
  EquipmentSlice &
  ServiceItemSlice &
  ServiceRecordSlice &
  ServiceOrderSlice &
  NotificationSlice & {
    /** 全エンティティを初期状態に戻す（設定画面の全削除・テスト分離用） */
    resetAll: () => void;
    /** CSVインポート確定: 対象エンティティの Record を検証済みデータで全置換する（D-029） */
    replaceEntities: <Key extends keyof AppState>(key: Key, entities: AppState[Key]) => void;
  };

/**
 * スライス定義用の StateCreator 別名。ミドルウェア合成 persist(immer(...))
 * （coding-standards.md §5）の内側で動くため、set はImmerドラフトを受け取る。
 */
export type AppSliceCreator<Slice> = StateCreator<
  StoreState,
  [["zustand/persist", unknown], ["zustand/immer", never]],
  [],
  Slice
>;
