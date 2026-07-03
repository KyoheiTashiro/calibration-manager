/**
 * 横断 selector（複数エンティティ導出）。store を引数に取る純関数として定義し、
 * コンポーネントは `useAppStore((state) => itemsOf(state, id))` の形で購読する
 * （coding-standards.md §5、store.md「派生」）。
 */

import { deriveItemStatus, type ItemStatus } from "@/domain/itemStatus";
import { recommendedOrderDate } from "@/domain/leadTime";
import { isActiveOrderStatus } from "@/domain/orderStatus";
import {
  EQUIPMENT_STATUS,
  EXECUTION,
  type AppState,
  type CalibrationOrder,
  type Equipment,
  type InspectionItem,
  type InspectionRecord,
  type IsoDateString,
} from "@/store/types";

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

/** 項目一覧・ダッシュボードで共有する1行（表示に必要な導出値を同梱） */
export type ItemRow = {
  item: InspectionItem;
  equipment: Equipment;
  status: ItemStatus; // deriveItemStatus による導出値
  personLabel: string; // personLabelOf(D-001: dangling「—」、無効「(無効)」注記)
  recommendedOrderDate: IsoDateString | null; // recommendedOrderDate(§4.2)。内部・算出不能は null
  canCreateOrder: boolean; // external かつ 有効な案件(isActiveOrderStatus)なし
};

/** 表示順: nextDueDate 昇順、同値は item.id 昇順（§5 既定並び） */
const compareItemRows = (left: ItemRow, right: ItemRow): number =>
  left.item.nextDueDate.localeCompare(right.item.nextDueDate) ||
  left.item.id.localeCompare(right.item.id);

/**
 * 表示対象の項目行を構築する横断 selector。対象は status=active 機器の isActive=true 項目のみ(D-023)。
 * 参照先機器のない項目(dangling)は行にしない。並びは nextDueDate 昇順、同値は item.id 昇順。
 *
 * 項目一覧(§5)とダッシュボード(§1)が同一規則で行を導出するため、feature 間 import を避けて
 * 横断導出を selectors.ts に純関数で置く規約(coding-standards.md §5、D-024)に従いここへ集約する。
 */
export const itemRowsOf = (
  state: Pick<AppState, "items" | "equipment" | "orders" | "vendors" | "persons">,
  today: IsoDateString,
): ItemRow[] => {
  const rows: ItemRow[] = [];
  for (const item of Object.values(state.items)) {
    if (!item.isActive) continue;
    const equipment = state.equipment[item.equipmentId];
    if (equipment === undefined) continue; // dangling: 参照先機器なし
    if (equipment.status !== EQUIPMENT_STATUS.ACTIVE) continue;

    const vendor = item.vendorId ? (state.vendors[item.vendorId] ?? null) : null;
    const itemOrders: CalibrationOrder[] = ordersOf({ orders: state.orders }, item.id);
    const isExternal = item.execution === EXECUTION.EXTERNAL;

    rows.push({
      item,
      equipment,
      status: deriveItemStatus(item, itemOrders, vendor, today),
      personLabel: personLabelOf({ persons: state.persons }, item.personId),
      recommendedOrderDate: recommendedOrderDate(item, vendor),
      canCreateOrder: isExternal && !itemOrders.some((order) => isActiveOrderStatus(order.status)),
    });
  }
  return rows.toSorted(compareItemRows);
};
