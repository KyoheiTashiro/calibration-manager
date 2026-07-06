import { serviceItemsOf } from "@/store/selectors";
import { EQUIPMENT_STATUS, type Equipment, type EquipmentStatus } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useMemo, useState } from "react";

/**
 * ドメインの EquipmentStatus とは別軸（「稼働+休止」「全て」という複合値を持つ）のため
 * features/equipment/constants.ts には追加せずこのファイルに閉じたモジュールレベル定数とする。
 */
const STATUS_FILTER = {
  ACTIVE_AND_SUSPENDED: "activeAndSuspended",
  ALL: "all",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  RETIRED: "retired",
} as const;
export type StatusFilter = (typeof STATUS_FILTER)[keyof typeof STATUS_FILTER];

export const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: STATUS_FILTER.ACTIVE_AND_SUSPENDED, label: "稼働+休止" },
  { value: STATUS_FILTER.ALL, label: "全て" },
  { value: STATUS_FILTER.ACTIVE, label: "稼働" },
  { value: STATUS_FILTER.SUSPENDED, label: "休止" },
  { value: STATUS_FILTER.RETIRED, label: "廃棄" },
];

/**
 * 文字列が StatusFilter か判定する実行時型ガード。<select> の onChange イベント値は
 * 型上ただの string のため、Select の options（STATUS_FILTER_OPTIONS）に実在する値かを
 * 検証してから安全に絞り込む（as によるアサーションを避けるため）。
 */
export const isStatusFilter = (value: string): value is StatusFilter =>
  STATUS_FILTER_OPTIONS.some((option) => option.value === value);

/**
 * 状態フィルタと機器の状態マッチングルール。
 * switch だと lint(default-case)が到達不能な default を要求してしまうため、
 * Record<StatusFilter, ...> のルックアップ定数で全フィルタ値の網羅を型レベルで保証する。
 */
const MATCHES_STATUS_FILTER_RULES: Record<StatusFilter, (status: EquipmentStatus) => boolean> = {
  [STATUS_FILTER.ALL]: () => true,
  [STATUS_FILTER.ACTIVE]: (status) => status === EQUIPMENT_STATUS.ACTIVE,
  [STATUS_FILTER.SUSPENDED]: (status) => status === EQUIPMENT_STATUS.SUSPENDED,
  [STATUS_FILTER.RETIRED]: (status) => status === EQUIPMENT_STATUS.RETIRED,
  [STATUS_FILTER.ACTIVE_AND_SUSPENDED]: (status) => status !== EQUIPMENT_STATUS.RETIRED,
};

const matchesStatusFilter = (status: EquipmentStatus, filter: StatusFilter): boolean =>
  MATCHES_STATUS_FILTER_RULES[filter](status);

const matchesSearch = (equipment: Equipment, normalizedSearch: string): boolean => {
  if (normalizedSearch === "") return true;
  const haystack = [equipment.managementNo, equipment.name, equipment.model ?? ""]
    .join("\n")
    .toLowerCase();
  return haystack.includes(normalizedSearch);
};

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

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    STATUS_FILTER.ACTIVE_AND_SUSPENDED,
  );

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
    if (target.status !== EQUIPMENT_STATUS.ACTIVE) return "—";
    const dueDates = serviceItemsOf({ serviceItems }, target.id)
      .filter((serviceItem) => serviceItem.isActive)
      .map((serviceItem) => serviceItem.nextDueDate);
    if (dueDates.length === 0) return "—";
    return dueDates.toSorted((left, right) => left.localeCompare(right))[0] ?? "—";
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
