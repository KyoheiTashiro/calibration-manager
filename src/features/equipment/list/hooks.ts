import { UNSET_LABEL } from '@/constants/labels';
import { EQUIPMENT_STATUS_LABELS } from '@/features/equipment/constants';
import { serviceItemsOf } from '@/store/selectors';
import { EQUIPMENT_STATUS, type Equipment, type EquipmentStatus } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { isOneOf } from '@/utils/guard';
import { matchesSearchText } from '@/utils/search';
import { useMemo, useState } from 'react';

/**
 * ドメインの EquipmentStatus とは別軸（「全て」という複合値を持つ）のため
 * features/equipment/constants.ts には追加せずこのファイルに閉じたモジュールレベル定数とする。
 * ALL 以外の値は EquipmentStatus と同一文字列にし、状態との直接比較で絞り込めるようにする。
 */
const STATUS_FILTER = {
  ALL: 'all',
  ...EQUIPMENT_STATUS,
} as const;
export type StatusFilter = (typeof STATUS_FILTER)[keyof typeof STATUS_FILTER];

export const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: STATUS_FILTER.ALL, label: '全て' },
  ...Object.values(EQUIPMENT_STATUS).map((status) => ({
    value: status,
    label: EQUIPMENT_STATUS_LABELS[status],
  })),
];

/**
 * 文字列が StatusFilter か判定する実行時型ガード。<select> の onChange イベント値は
 * 型上ただの string のため、STATUS_FILTER に実在する値かを
 * 検証してから安全に絞り込む（as によるアサーションを避けるため）。
 */
export const isStatusFilter = (value: string): value is StatusFilter =>
  isOneOf(value, Object.values(STATUS_FILTER));

const matchesStatusFilter = (status: EquipmentStatus, filter: StatusFilter): boolean =>
  filter === STATUS_FILTER.ALL || status === filter;

const matchesSearch = (equipment: Equipment, normalizedSearch: string): boolean =>
  matchesSearchText([equipment.managementNo, equipment.name, equipment.model], normalizedSearch);

type UseEquipmentListResult = {
  totalCount: number;
  filteredEquipmentList: Equipment[];
  searchText: string;
  setSearchText: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  manufacturerNameOf: (target: Equipment) => string | undefined;
  serviceItemCountOf: (target: Equipment) => number;
  nearestDueDateOf: (target: Equipment) => string;
};

export const useEquipmentList = (): UseEquipmentListResult => {
  const equipment = useAppStore((state) => state.equipment);
  const vendors = useAppStore((state) => state.vendors);
  const serviceItems = useAppStore((state) => state.serviceItems);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_FILTER.ALL);

  const totalCount = Object.keys(equipment).length;

  const filteredEquipmentList = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return Object.values(equipment)
      .filter((entry) => matchesStatusFilter(entry.status, statusFilter))
      .filter((entry) => matchesSearch(entry, normalizedSearch))
      .toSorted((left, right) => left.managementNo.localeCompare(right.managementNo));
  }, [equipment, searchText, statusFilter]);

  const manufacturerNameOf = (target: Equipment): string | undefined =>
    target.manufacturerId === undefined ? undefined : vendors[target.manufacturerId]?.name;

  const serviceItemCountOf = (target: Equipment): number =>
    serviceItemsOf({ serviceItems }, target.id).length;

  const nearestDueDateOf = (target: Equipment): string => {
    if (target.status !== EQUIPMENT_STATUS.ACTIVE) return UNSET_LABEL;
    const dueDates = serviceItemsOf({ serviceItems }, target.id)
      .filter((serviceItem) => serviceItem.isActive)
      .map((serviceItem) => serviceItem.nextDueDate);
    return dueDates.toSorted((left, right) => left.localeCompare(right))[0] ?? UNSET_LABEL;
  };

  return {
    totalCount,
    filteredEquipmentList,
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
    manufacturerNameOf,
    serviceItemCountOf,
    nearestDueDateOf,
  };
};
