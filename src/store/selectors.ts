/**
 * 横断 selector（複数エンティティ導出）。store を引数に取る純関数として定義し、
 * コンポーネントは `useAppStore((state) => serviceItemsOf(state, id))` の形で購読する。
 */

import { recommendedOrderDate } from "@/domain/leadTime";
import { deriveServiceItemStatus, type ServiceItemStatus } from "@/domain/serviceItemStatus";
import { isActiveServiceOrderStatus } from "@/domain/serviceOrderStatus";
import {
  EQUIPMENT_STATUS,
  EXECUTION,
  type AppState,
  type ServiceOrder,
  type Equipment,
  type ServiceItem,
  type ServiceRecord,
  type IsoDateString,
} from "@/store/types";
import { recordValue } from "@/utils/record";

export const serviceItemsOf = (
  state: Pick<AppState, "serviceItems">,
  equipmentId: string,
): ServiceItem[] =>
  Object.values(state.serviceItems).filter(
    (serviceItem) => serviceItem.equipmentId === equipmentId,
  );

export const serviceOrdersOf = (
  state: Pick<AppState, "serviceOrders">,
  serviceItemId: string,
): ServiceOrder[] =>
  Object.values(state.serviceOrders).filter(
    (serviceOrder) => serviceOrder.serviceItemId === serviceItemId,
  );

/** 項目に紐づく実施記録の一覧（実施日の新しい順。同日はid辞書順で決定的に） */
export const serviceRecordsOf = (
  state: Pick<AppState, "serviceRecords">,
  serviceItemId: string,
): ServiceRecord[] =>
  Object.values(state.serviceRecords)
    .filter((serviceRecord) => serviceRecord.serviceItemId === serviceItemId)
    .toSorted(
      (left, right) =>
        right.doneDate.localeCompare(left.doneDate) || left.id.localeCompare(right.id),
    );

/** 機器詳細・項目一覧など担当者名を表示する全画面がこれを使う。 */
export const personLabelOf = (state: Pick<AppState, "persons">, personId: string): string => {
  const person = recordValue(state.persons, personId);
  if (person === undefined) return "—";
  return person.isActive ? person.name : `${person.name}(無効)`;
};

/**
 * store の removeVendor の参照ガードと、
 * features/vendors 側の削除クリック時の事前チェックが同一判定を共用するための横断 selector。
 */
export const isVendorReferenced = (
  state: Pick<AppState, "equipment" | "serviceItems" | "serviceOrders">,
  vendorId: string,
): boolean =>
  Object.values(state.equipment).some(
    (equipmentEntry) => equipmentEntry.manufacturerId === vendorId,
  ) ||
  Object.values(state.serviceItems).some(
    (serviceItemEntry) => serviceItemEntry.vendorId === vendorId,
  ) ||
  Object.values(state.serviceOrders).some(
    (serviceOrderEntry) => serviceOrderEntry.vendorId === vendorId,
  );

/** ヘッダーの通知ベルに出す未読件数 */
export const unreadNotificationCount = (state: Pick<AppState, "notifications">): number =>
  Object.values(state.notifications).filter((notification) => !notification.isRead).length;

/** 項目一覧・ダッシュボードで共有する1行（表示に必要な導出値を同梱） */
export type ServiceItemRow = {
  serviceItem: ServiceItem;
  equipment: Equipment;
  status: ServiceItemStatus;
  personLabel: string;
  recommendedOrderDate: IsoDateString | null; // 内部・算出不能は null
  canCreateServiceOrder: boolean; // external かつ 有効な案件(isActiveServiceOrderStatus)なし
};

/** 表示順: nextDueDate 昇順、同値は serviceItem.id 昇順 */
const compareServiceItemRows = (left: ServiceItemRow, right: ServiceItemRow): number =>
  left.serviceItem.nextDueDate.localeCompare(right.serviceItem.nextDueDate) ||
  left.serviceItem.id.localeCompare(right.serviceItem.id);

/**
 * 表示対象の項目行を構築する横断 selector。
 *
 * 項目一覧とダッシュボードが同一規則で行を導出するため、feature 間 import を避けて
 * 横断導出を selectors.ts に純関数で置く規約に従いここへ集約する。
 */
export const serviceItemRowsOf = (
  state: Pick<AppState, "serviceItems" | "equipment" | "serviceOrders" | "vendors" | "persons">,
  today: IsoDateString,
): ServiceItemRow[] => {
  const rows: ServiceItemRow[] = [];
  for (const serviceItem of Object.values(state.serviceItems)) {
    if (!serviceItem.isActive) continue;
    const equipment = recordValue(state.equipment, serviceItem.equipmentId);
    if (equipment === undefined) continue; // dangling: 参照先機器なし
    if (equipment.status !== EQUIPMENT_STATUS.ACTIVE) continue;

    const vendor =
      serviceItem.vendorId === undefined ? null : (state.vendors[serviceItem.vendorId] ?? null);
    const itemServiceOrders: ServiceOrder[] = serviceOrdersOf(
      { serviceOrders: state.serviceOrders },
      serviceItem.id,
    );
    const isExternal = serviceItem.execution === EXECUTION.EXTERNAL;

    rows.push({
      serviceItem,
      equipment,
      status: deriveServiceItemStatus(serviceItem, itemServiceOrders, vendor, today),
      personLabel: personLabelOf({ persons: state.persons }, serviceItem.personId),
      recommendedOrderDate: recommendedOrderDate(serviceItem, vendor),
      canCreateServiceOrder:
        isExternal &&
        !itemServiceOrders.some((serviceOrder) => isActiveServiceOrderStatus(serviceOrder.status)),
    });
  }
  return rows.toSorted(compareServiceItemRows);
};
