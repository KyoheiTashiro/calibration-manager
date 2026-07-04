/**
 * 横断 selector（複数エンティティ導出）。store を引数に取る純関数として定義し、
 * コンポーネントは `useAppStore((state) => inspectionItemsOf(state, id))` の形で購読する
 * （coding-standards.md §5、store.md「派生」）。
 */

import {
  deriveInspectionItemStatus,
  type InspectionItemStatus,
} from "@/domain/inspectionItemStatus";
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
import { recordValue } from "@/utils/record";

/** 機器に属する項目の一覧 */
export const inspectionItemsOf = (
  state: Pick<AppState, "inspectionItems">,
  equipmentId: string,
): InspectionItem[] =>
  Object.values(state.inspectionItems).filter(
    (inspectionItem) => inspectionItem.equipmentId === equipmentId,
  );

/** 項目に紐づく案件の一覧 */
export const ordersOf = (
  state: Pick<AppState, "orders">,
  inspectionItemId: string,
): CalibrationOrder[] =>
  Object.values(state.orders).filter((order) => order.inspectionItemId === inspectionItemId);

/** 項目に紐づく実施記録の一覧（実施日の新しい順。同日はid辞書順で決定的に） */
export const recordsOf = (
  state: Pick<AppState, "records">,
  inspectionItemId: string,
): InspectionRecord[] =>
  Object.values(state.records)
    .filter((record) => record.inspectionItemId === inspectionItemId)
    .toSorted(
      (left, right) =>
        right.doneDate.localeCompare(left.doneDate) || left.id.localeCompare(right.id),
    );

/**
 * 担当者名の解決。参照先なし(dangling)は「—」、無効化済みは「(無効)」を注記(D-001)。
 * 機器詳細・項目一覧など担当者名を表示する全画面がこれを使う。
 */
export const personLabelOf = (state: Pick<AppState, "persons">, personId: string): string => {
  const person = recordValue(state.persons, personId);
  if (person === undefined) return "—";
  return person.isActive ? person.name : `${person.name}(無効)`;
};

/** ヘッダーの通知ベルに出す未読件数（screen-design/README.md） */
export const unreadNotificationCount = (state: Pick<AppState, "notifications">): number =>
  Object.values(state.notifications).filter((notification) => !notification.isRead).length;

/** 項目一覧・ダッシュボードで共有する1行（表示に必要な導出値を同梱） */
export type InspectionItemRow = {
  inspectionItem: InspectionItem;
  equipment: Equipment;
  status: InspectionItemStatus; // deriveInspectionItemStatus による導出値
  personLabel: string; // personLabelOf(D-001: dangling「—」、無効「(無効)」注記)
  recommendedOrderDate: IsoDateString | null; // recommendedOrderDate(§4.2)。内部・算出不能は null
  canCreateOrder: boolean; // external かつ 有効な案件(isActiveOrderStatus)なし
};

/** 表示順: nextDueDate 昇順、同値は inspectionItem.id 昇順（§5 既定並び） */
const compareInspectionItemRows = (left: InspectionItemRow, right: InspectionItemRow): number =>
  left.inspectionItem.nextDueDate.localeCompare(right.inspectionItem.nextDueDate) ||
  left.inspectionItem.id.localeCompare(right.inspectionItem.id);

/**
 * 表示対象の項目行を構築する横断 selector。対象は status=active 機器の isActive=true 項目のみ(D-023)。
 * 参照先機器のない項目(dangling)は行にしない。並びは nextDueDate 昇順、同値は inspectionItem.id 昇順。
 *
 * 項目一覧(§5)とダッシュボード(§1)が同一規則で行を導出するため、feature 間 import を避けて
 * 横断導出を selectors.ts に純関数で置く規約(coding-standards.md §5、D-024)に従いここへ集約する。
 */
export const inspectionItemRowsOf = (
  state: Pick<AppState, "inspectionItems" | "equipment" | "orders" | "vendors" | "persons">,
  today: IsoDateString,
): InspectionItemRow[] => {
  const rows: InspectionItemRow[] = [];
  for (const inspectionItem of Object.values(state.inspectionItems)) {
    if (!inspectionItem.isActive) continue;
    const equipment = recordValue(state.equipment, inspectionItem.equipmentId);
    if (equipment === undefined) continue; // dangling: 参照先機器なし
    if (equipment.status !== EQUIPMENT_STATUS.ACTIVE) continue;

    const vendor =
      inspectionItem.vendorId === undefined
        ? null
        : (state.vendors[inspectionItem.vendorId] ?? null);
    const inspectionItemOrders: CalibrationOrder[] = ordersOf(
      { orders: state.orders },
      inspectionItem.id,
    );
    const isExternal = inspectionItem.execution === EXECUTION.EXTERNAL;

    rows.push({
      inspectionItem,
      equipment,
      status: deriveInspectionItemStatus(inspectionItem, inspectionItemOrders, vendor, today),
      personLabel: personLabelOf({ persons: state.persons }, inspectionItem.personId),
      recommendedOrderDate: recommendedOrderDate(inspectionItem, vendor),
      canCreateOrder:
        isExternal && !inspectionItemOrders.some((order) => isActiveOrderStatus(order.status)),
    });
  }
  return rows.toSorted(compareInspectionItemRows);
};
