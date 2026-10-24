/**
 * - フィルタの真実源は URL クエリ(D-022)。
 * - 表示対象は稼働(active)機器の有効(isActive=true)項目のみ。無効・非稼働トグルは不実装(D-023)。
 * - ステータスは保存値ではなく導出値(serviceItemRowsOf 内 deriveServiceItemStatus)。
 */

import { SERVICE_ITEM_STATUS, type ServiceItemStatus } from '@/domain/serviceItemStatus';
import type { ServiceItemRow } from '@/store/selectors';
import {
  EXECUTION,
  SERVICE_ITEM_TYPE,
  type Execution,
  type ServiceItemType,
  type Person,
} from '@/store/types';
import { isOneOf } from '@/utils/guard';

export const FILTER_ALL = 'all' as const;

export type ServiceItemListFilters = {
  status: ServiceItemStatus | typeof FILTER_ALL;
  type: ServiceItemType | typeof FILTER_ALL;
  execution: Execution | typeof FILTER_ALL;
  personId: string; // Person.id または "all"("all" は string の部分集合のため union にしない)
};

const readEnumParam = <Enum extends string>(
  raw: string | null,
  allowed: readonly Enum[],
): Enum | typeof FILTER_ALL => (raw !== null && isOneOf(raw, allowed) ? raw : FILTER_ALL);

export const parseServiceItemListFilters = (
  params: URLSearchParams,
  persons: Record<string, Person>,
): ServiceItemListFilters => {
  const personId = params.get('personId');
  return {
    status: readEnumParam(params.get('status'), Object.values(SERVICE_ITEM_STATUS)),
    type: readEnumParam(params.get('type'), Object.values(SERVICE_ITEM_TYPE)),
    execution: readEnumParam(params.get('execution'), Object.values(EXECUTION)),
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
