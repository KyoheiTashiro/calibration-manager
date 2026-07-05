/**
 * 開発用シードデータ（DEV限定）。
 * `npm run dev` 起動時にのみ src/main.tsx から動的importされ、本番ビルドには含まれない
 * （import.meta.env.DEV ガードにより Rollup がデッドコード除去する）。
 * 画面確認用に全ステータス（overdue/orderNow/inProgress/dueSoon/ok）が揃うよう設計している。
 * データ本体は src/dev/seedMasterData.ts（マスタ系）・src/dev/seedTransactionData.ts
 * （日付依存のトランザクション系）に分割し、本ファイルは組み立てのみを担う。
 */

import { buildSeedEquipment, buildSeedPersons, buildSeedVendors } from "@/dev/seedMasterData";
import {
  buildSeedServiceItems,
  buildSeedServiceOrders,
  buildSeedRecords,
} from "@/dev/seedTransactionData";
import type { AppState, IsoDateString } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { todayIsoDate } from "@/utils/time";

export const buildSeedState = (today: IsoDateString): AppState => ({
  vendors: buildSeedVendors(),
  persons: buildSeedPersons(),
  equipment: buildSeedEquipment(),
  serviceItems: buildSeedServiceItems(today),
  serviceRecords: buildSeedRecords(today),
  serviceOrders: buildSeedServiceOrders(today),
  // なぜ空オブジェクトか: notifications は useNotificationScan（D-025）が起動時に
  // 導出データとして再生成する対象であり、シードとしては持たない（保存しない派生値）。
  notifications: {},
});

/**
 * 全ストレージが空（初回起動）の場合のみシードを投入する。
 * 既存データが1つでもあれば何もせず false を返す（ユーザー入力データを上書きしない）。
 */
export const seedIfEmpty = (): boolean => {
  const state = useAppStore.getState();
  const isEmpty = [
    state.vendors,
    state.persons,
    state.equipment,
    state.serviceItems,
    state.serviceRecords,
    state.serviceOrders,
    state.notifications,
  ].every((entities) => Object.keys(entities).length === 0);

  if (!isEmpty) return false;

  useAppStore.setState(buildSeedState(todayIsoDate()));
  return true;
};
