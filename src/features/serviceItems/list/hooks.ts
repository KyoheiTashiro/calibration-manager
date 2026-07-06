/**
 * - フィルタの真実源は URL クエリ(D-022)。
 * - 表示対象は稼働(active)機器の有効(isActive=true)項目のみ。無効・非稼働トグルは不実装(D-023)。
 * - ステータスは保存値ではなく導出値(serviceItemRowsOf 内 deriveServiceItemStatus)。
 */

import { SERVICE_ITEM_STATUS, type ServiceItemStatus } from "@/domain/serviceItemStatus";
import type { ServiceItemRow } from "@/store/selectors";
import {
  EXECUTION,
  SERVICE_ITEM_TYPE,
  type Execution,
  type ServiceItemType,
  type Person,
} from "@/store/types";

export const FILTER_ALL = "all" as const;

export type ServiceItemListFilters = {
  status: ServiceItemStatus | typeof FILTER_ALL;
  type: ServiceItemType | typeof FILTER_ALL;
  execution: Execution | typeof FILTER_ALL;
  personId: string; // Person.id または "all"("all" は string の部分集合のため union にしない)
};

const SERVICE_ITEM_STATUS_VALUES: readonly ServiceItemStatus[] = Object.values(SERVICE_ITEM_STATUS);
const SERVICE_ITEM_TYPE_VALUES: readonly ServiceItemType[] = Object.values(SERVICE_ITEM_TYPE);
const EXECUTION_VALUES: readonly Execution[] = Object.values(EXECUTION);

const isEnumValue = <Enum extends string>(raw: string, allowed: readonly Enum[]): raw is Enum =>
  allowed.some((value) => value === raw);

const readEnumParam = <Enum extends string>(
  raw: string | null,
  allowed: readonly Enum[],
): Enum | typeof FILTER_ALL => (raw !== null && isEnumValue(raw, allowed) ? raw : FILTER_ALL);

export const parseServiceItemListFilters = (
  params: URLSearchParams,
  persons: Record<string, Person>,
): ServiceItemListFilters => {
  const personId = params.get("personId");
  return {
    status: readEnumParam<ServiceItemStatus>(params.get("status"), SERVICE_ITEM_STATUS_VALUES),
    type: readEnumParam<ServiceItemType>(params.get("type"), SERVICE_ITEM_TYPE_VALUES),
    execution: readEnumParam<Execution>(params.get("execution"), EXECUTION_VALUES),
    personId: personId !== null && personId in persons ? personId : FILTER_ALL,
  };
};
export const filterServiceItemRows = (
  rows: readonly ServiceItemRow[],
  filters: ServiceItemListFilters,
): ServiceItemRow[] =>
  rows.filter(
    (row) =>
      (filters.status === FILTER_ALL || row.status === filters.status) &&
      (filters.type === FILTER_ALL || row.serviceItem.type === filters.type) &&
      (filters.execution === FILTER_ALL || row.serviceItem.execution === filters.execution) &&
      (filters.personId === FILTER_ALL || row.serviceItem.personId === filters.personId),
  );
