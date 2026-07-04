/**
 * 機器詳細画面のロジック（並び替え・項目ステータスの表示可否判定）を集約する。
 * index.tsx を薄いビューに保つ（coding-standards.md §2「hooks.ts は全 feature に置く」）。
 * D-014: 項目ステータスは機器が稼働(active)のときのみ導出し、それ以外は null（「—」表示）とする。
 */

import {
  deriveInspectionItemStatus,
  type InspectionItemStatus,
} from "@/domain/inspectionItemStatus";
import { inspectionItemsOf, ordersOf, recordsOf } from "@/store/selectors";
import {
  EQUIPMENT_STATUS,
  type CalibrationOrder,
  type EquipmentStatus,
  type InspectionItem,
  type InspectionRecord,
  type Vendor,
} from "@/store/types";
import { todayIsoDate } from "@/utils/time";

// 担当者表示名は selectors へ昇格済み(D-024)。この画面の表示ロジック一式を
// hooks 経由で供給するため再 export する(index.tsx の依存数も抑える)
export { personLabelOf } from "@/store/selectors";

/** 実施記録の1行(項目横断マージ用に項目名を同梱) */
export type HistoryRow = { record: InspectionRecord; inspectionItemName: string };

/** 項目一覧の並び順: isActive=true を先頭に、両グループ内は nextDueDate 昇順(同値は id 昇順) */
const compareInspectionItemRows = (left: InspectionItem, right: InspectionItem): number => {
  if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
  return left.nextDueDate.localeCompare(right.nextDueDate) || left.id.localeCompare(right.id);
};

/**
 * 実施記録の並び順。recordsOf は項目単位で既にソート済みだが、複数項目を
 * flatMap でマージした配列は全体としてソート済みでなくなるため、同一比較関数で再ソートする。
 */
const compareHistoryRows = (left: HistoryRow, right: HistoryRow): number =>
  right.record.doneDate.localeCompare(left.record.doneDate) ||
  left.record.id.localeCompare(right.record.id);

/** この機器に属する項目一覧を表示順(isActive優先→nextDueDate昇順→id昇順)へ並べ替える */
export const sortedInspectionItemsOf = (
  inspectionItems: Record<string, InspectionItem>,
  equipmentId: string,
): InspectionItem[] =>
  inspectionItemsOf({ inspectionItems }, equipmentId).toSorted(compareInspectionItemRows);

/** この機器の全項目の実施記録を項目横断でマージし、doneDate降順(同日はid昇順)に並べる */
export const historyRowsOf = (
  inspectionItems: Record<string, InspectionItem>,
  records: Record<string, InspectionRecord>,
  equipmentId: string,
): HistoryRow[] =>
  inspectionItemsOf({ inspectionItems }, equipmentId)
    .flatMap((inspectionItem) =>
      recordsOf({ records }, inspectionItem.id).map((record) => ({
        record,
        inspectionItemName: inspectionItem.name,
      })),
    )
    .toSorted(compareHistoryRows);

/**
 * 項目一覧行に表示するステータス。D-014により機器が稼働(active)でなければ
 * null を返す。呼び出し側は null のとき「—」を表示する。
 */
export const displayedInspectionItemStatus = (
  inspectionItem: InspectionItem,
  equipmentStatus: EquipmentStatus,
  orders: Record<string, CalibrationOrder>,
  vendors: Record<string, Vendor>,
): InspectionItemStatus | null => {
  if (equipmentStatus !== EQUIPMENT_STATUS.ACTIVE) return null;
  const vendor =
    inspectionItem.vendorId !== undefined && inspectionItem.vendorId !== ""
      ? (vendors[inspectionItem.vendorId] ?? null)
      : null;
  return deriveInspectionItemStatus(
    inspectionItem,
    ordersOf({ orders }, inspectionItem.id),
    vendor,
    todayIsoDate(),
  );
};
