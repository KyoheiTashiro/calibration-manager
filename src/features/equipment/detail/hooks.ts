import { deriveServiceItemStatus, type ServiceItemStatus } from "@/domain/serviceItemStatus";
import { serviceItemsOf, serviceOrdersOf, serviceRecordsOf } from "@/store/selectors";
import {
  EQUIPMENT_STATUS,
  type ServiceOrder,
  type EquipmentStatus,
  type ServiceItem,
  type ServiceRecord,
  type IsoDateString,
  type Vendor,
} from "@/store/types";

// ServiceItem 型も同様の理由で再 export する(index.tsx の @/store/types への
// 直接依存を減らし import/max-dependencies 対策とする)
export type { ServiceItem } from "@/store/types";

// 担当者表示名は selectors へ昇格済み(D-024)。この画面の表示ロジック一式を
// hooks 経由で供給するため再 export する(index.tsx の依存数も抑える)
export { personLabelOf } from "@/store/selectors";

// useSafeNavigate も同様に hooks 経由で再 export し、index.tsx が @/utils への
// 直接依存を持たないようにする(import/max-dependencies 対策)
export { useSafeNavigate } from "@/utils/navigation";

// todayIsoDate も同様の理由で hooks 経由で再 export する(import/max-dependencies 対策)
export { todayIsoDate } from "@/utils/time";

export type ServiceRecordRow = { serviceRecord: ServiceRecord; serviceItemName: string };

const compareServiceItemRows = (left: ServiceItem, right: ServiceItem): number => {
  if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
  return left.nextDueDate.localeCompare(right.nextDueDate) || left.id.localeCompare(right.id);
};

/**
 * 実施記録の並び順。serviceRecordsOf は項目単位で既にソート済みだが、複数項目を
 * flatMap でマージした配列は全体としてソート済みでなくなるため、同一比較関数で再ソートする。
 */
const compareHistoryRows = (left: ServiceRecordRow, right: ServiceRecordRow): number =>
  right.serviceRecord.doneDate.localeCompare(left.serviceRecord.doneDate) ||
  left.serviceRecord.id.localeCompare(right.serviceRecord.id);

export const sortedServiceItemsOf = (
  serviceItems: Record<string, ServiceItem>,
  equipmentId: string,
): ServiceItem[] => serviceItemsOf({ serviceItems }, equipmentId).toSorted(compareServiceItemRows);

export const historyRowsOf = (
  serviceItems: Record<string, ServiceItem>,
  serviceRecords: Record<string, ServiceRecord>,
  equipmentId: string,
): ServiceRecordRow[] =>
  serviceItemsOf({ serviceItems }, equipmentId)
    .flatMap((serviceItem) =>
      serviceRecordsOf({ serviceRecords }, serviceItem.id).map((serviceRecord) => ({
        serviceRecord,
        serviceItemName: serviceItem.name,
      })),
    )
    .toSorted(compareHistoryRows);

/** today は呼び出し側から注入する(serviceItemRowsOf と同方針、テスト容易性のため)。 */
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
