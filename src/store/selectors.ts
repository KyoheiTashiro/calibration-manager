/**
 * 横断 selector（複数エンティティ導出）。store を引数に取る純関数として定義し、
 * コンポーネントは `useAppStore((state) => itemsOf(state, id))` の形で購読する
 * （coding-standards.md §5、store.md「派生」）。
 */

import type { AppState, CalibrationOrder, InspectionItem, InspectionRecord } from "@/store/types";

/** 機器に属する項目の一覧 */
export const itemsOf = (state: Pick<AppState, "items">, equipmentId: string): InspectionItem[] =>
  Object.values(state.items).filter((item) => item.equipmentId === equipmentId);

/** 項目に紐づく案件の一覧 */
export const ordersOf = (state: Pick<AppState, "orders">, itemId: string): CalibrationOrder[] =>
  Object.values(state.orders).filter((order) => order.itemId === itemId);

/** 項目に紐づく実施記録の一覧（実施日の新しい順。同日はid辞書順で決定的に） */
export const recordsOf = (state: Pick<AppState, "records">, itemId: string): InspectionRecord[] =>
  Object.values(state.records)
    .filter((record) => record.itemId === itemId)
    .toSorted(
      (left, right) =>
        right.doneDate.localeCompare(left.doneDate) || left.id.localeCompare(right.id),
    );

/**
 * 担当者名の解決。参照先なし(dangling)は「—」、無効化済みは「(無効)」を注記(decisions.md D-001)。
 * 機器詳細・項目一覧など担当者名を表示する全画面がこれを使う。
 */
export const personLabelOf = (state: Pick<AppState, "persons">, personId: string): string => {
  const person = state.persons[personId];
  if (person === undefined) return "—";
  return person.isActive ? person.name : `${person.name}(無効)`;
};

/** ヘッダーの通知ベルに出す未読件数（screen-design/README.md） */
export const unreadNotificationCount = (state: Pick<AppState, "notifications">): number =>
  Object.values(state.notifications).filter((notification) => !notification.isRead).length;
