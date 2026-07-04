/**
 * 機器詳細画面のロジック（並び替え・項目ステータスの表示可否判定）を集約する。
 * index.tsx を薄いビューに保つ（coding-standards.md §2「hooks.ts は全 feature に置く」）。
 * D-014: 項目ステータスは機器が稼働(active)のときのみ導出し、それ以外は null（「—」表示）とする。
 */

import { deriveServiceItemStatus, type ServiceItemStatus } from "@/domain/serviceItemStatus";
import { serviceItemsOf, serviceOrdersOf, recordsOf } from "@/store/selectors";
import {
  EQUIPMENT_STATUS,
  type ServiceOrder,
  type EquipmentStatus,
  type ServiceItem,
  type ServiceRecord,
  type IsoDateString,
  type Vendor,
} from "@/store/types";

// 担当者表示名は selectors へ昇格済み(D-024)。この画面の表示ロジック一式を
// hooks 経由で供給するため再 export する(index.tsx の依存数も抑える)
export { personLabelOf } from "@/store/selectors";

// useSafeNavigate も同様に hooks 経由で再 export し、index.tsx が @/utils への
// 直接依存を持たないようにする(import/max-dependencies 対策)
export { useSafeNavigate } from "@/utils/navigation";

// todayIsoDate も同様の理由で hooks 経由で再 export する(import/max-dependencies 対策)
export { todayIsoDate } from "@/utils/time";

/** 実施記録の1行(項目横断マージ用に項目名を同梱) */
export type HistoryRow = { record: ServiceRecord; serviceItemName: string };

/** 項目一覧の並び順: isActive=true を先頭に、両グループ内は nextDueDate 昇順(同値は id 昇順) */
const compareServiceItemRows = (left: ServiceItem, right: ServiceItem): number => {
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
export const sortedServiceItemsOf = (
  serviceItems: Record<string, ServiceItem>,
  equipmentId: string,
): ServiceItem[] => serviceItemsOf({ serviceItems }, equipmentId).toSorted(compareServiceItemRows);

/** この機器の全項目の実施記録を項目横断でマージし、doneDate降順(同日はid昇順)に並べる */
export const historyRowsOf = (
  serviceItems: Record<string, ServiceItem>,
  records: Record<string, ServiceRecord>,
  equipmentId: string,
): HistoryRow[] =>
  serviceItemsOf({ serviceItems }, equipmentId)
    .flatMap((serviceItem) =>
      recordsOf({ records }, serviceItem.id).map((record) => ({
        record,
        serviceItemName: serviceItem.name,
      })),
    )
    .toSorted(compareHistoryRows);

/**
 * 項目一覧行に表示するステータス。D-014により機器が稼働(active)でなければ
 * null を返す。呼び出し側は null のとき「—」を表示する。
 * today は呼び出し側から注入する(serviceItemRowsOf と同方針、テスト容易性のため)。
 */
export const displayedServiceItemStatus = (
  serviceItem: ServiceItem,
  equipmentStatus: EquipmentStatus,
  serviceOrders: Record<string, ServiceOrder>,
  vendors: Record<string, Vendor>,
  today: IsoDateString,
): ServiceItemStatus | null => {
  if (equipmentStatus !== EQUIPMENT_STATUS.ACTIVE) return null;
  const vendor =
    serviceItem.vendorId !== undefined && serviceItem.vendorId !== ""
      ? (vendors[serviceItem.vendorId] ?? null)
      : null;
  return deriveServiceItemStatus(
    serviceItem,
    serviceOrdersOf({ serviceOrders }, serviceItem.id),
    vendor,
    today,
  );
};
