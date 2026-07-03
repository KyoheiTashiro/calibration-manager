/**
 * 機器詳細画面のロジック（並び替え・担当者表示名解決・項目ステータスの表示可否判定）を集約する。
 * index.tsx を薄いビューに保つ（coding-standards.md §2「hooks.ts は全 feature に置く」）。
 * D-014: 項目ステータスは機器が稼働(active)のときのみ導出し、それ以外は null（「—」表示）とする。
 */

import { deriveItemStatus, type ItemStatus } from "@/domain/itemStatus";
import { itemsOf, ordersOf, recordsOf } from "@/store/selectors";
import {
  EQUIPMENT_STATUS,
  type CalibrationOrder,
  type EquipmentStatus,
  type InspectionItem,
  type InspectionRecord,
  type Person,
  type Vendor,
} from "@/store/types";
import { todayIsoDate } from "@/utils/time";

/** 実施履歴の1行(項目横断マージ用に項目名を同梱) */
export type HistoryRow = { record: InspectionRecord; itemName: string };

/** 項目一覧の並び順: isActive=true を先頭に、両グループ内は nextDueDate 昇順(同値は id 昇順) */
const compareItemRows = (left: InspectionItem, right: InspectionItem): number => {
  if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
  return left.nextDueDate.localeCompare(right.nextDueDate) || left.id.localeCompare(right.id);
};

/**
 * 実施履歴の並び順。recordsOf は項目単位で既にソート済みだが、複数項目を
 * flatMap でマージした配列は全体としてソート済みでなくなるため、同一比較関数で再ソートする。
 */
const compareHistoryRows = (left: HistoryRow, right: HistoryRow): number =>
  right.record.doneDate.localeCompare(left.record.doneDate) ||
  left.record.id.localeCompare(right.record.id);

/** この機器に属する項目一覧を表示順(isActive優先→nextDueDate昇順→id昇順)へ並べ替える */
export const sortedItemsOf = (
  items: Record<string, InspectionItem>,
  equipmentId: string,
): InspectionItem[] => itemsOf({ items }, equipmentId).toSorted(compareItemRows);

/** この機器の全項目の実施履歴を項目横断でマージし、doneDate降順(同日はid昇順)に並べる */
export const historyRowsOf = (
  items: Record<string, InspectionItem>,
  records: Record<string, InspectionRecord>,
  equipmentId: string,
): HistoryRow[] =>
  itemsOf({ items }, equipmentId)
    .flatMap((item) =>
      recordsOf({ records }, item.id).map((record) => ({ record, itemName: item.name })),
    )
    .toSorted(compareHistoryRows);

/** 担当者名の解決。参照先なし(dangling)は「—」、無効化済みは「(無効)」を注記(D-001) */
export const personLabelOf = (persons: Record<string, Person>, personId: string): string => {
  const person = persons[personId];
  if (person === undefined) return "—";
  return person.isActive ? person.name : `${person.name}(無効)`;
};

/**
 * 項目一覧行に表示するステータス。D-014により機器が稼働(active)でなければ
 * null を返す。呼び出し側は null のとき「—」を表示する。
 */
export const displayedItemStatus = (
  item: InspectionItem,
  equipmentStatus: EquipmentStatus,
  orders: Record<string, CalibrationOrder>,
  vendors: Record<string, Vendor>,
): ItemStatus | null => {
  if (equipmentStatus !== EQUIPMENT_STATUS.ACTIVE) return null;
  const vendor = item.vendorId ? (vendors[item.vendorId] ?? null) : null;
  return deriveItemStatus(item, ordersOf({ orders }, item.id), vendor, todayIsoDate());
};
