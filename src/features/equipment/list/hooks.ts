/**
 * 機器一覧画面（screen-design/02-equipment-list.md）のフィルタ・導出ロジックと状態管理フック。
 * UI（index.tsx）を薄いビューに保つため切り出す（coding-standards.md §2）。
 */

import { inspectionItemsOf } from "@/store/selectors";
import { EQUIPMENT_STATUS, type Equipment, type EquipmentStatus } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useMemo, useState } from "react";

/**
 * 状態フィルタの選択肢（as const + 派生union、coding-standards.md §1）。
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

/** 状態フィルタの選択値が機器の状態に一致するか（screen-design/02-equipment-list.md「操作・アクション」） */
const matchesStatusFilter = (status: EquipmentStatus, filter: StatusFilter): boolean => {
  switch (filter) {
    case STATUS_FILTER.ALL: {
      return true;
    }
    case STATUS_FILTER.ACTIVE: {
      return status === EQUIPMENT_STATUS.ACTIVE;
    }
    case STATUS_FILTER.SUSPENDED: {
      return status === EQUIPMENT_STATUS.SUSPENDED;
    }
    case STATUS_FILTER.RETIRED: {
      return status === EQUIPMENT_STATUS.RETIRED;
    }
    case STATUS_FILTER.ACTIVE_AND_SUSPENDED: {
      return status !== EQUIPMENT_STATUS.RETIRED;
    }
    default: {
      return true;
    }
  }
};

/** 検索語がmanagementNo/name/modelのいずれかに部分一致するか(大文字小文字無視) */
const matchesSearch = (equipment: Equipment, normalizedSearch: string): boolean => {
  if (normalizedSearch === "") return true;
  const haystack = [equipment.managementNo, equipment.name, equipment.model ?? ""]
    .join("\n")
    .toLowerCase();
  return haystack.includes(normalizedSearch);
};

type UseEquipmentListResult = {
  /** フィルタ適用前の登録機器総数（未登録の空状態判定に使う） */
  totalCount: number;
  /** 検索・状態フィルタ適用後、管理番号昇順の機器リスト */
  filteredEquipmentList: Equipment[];
  searchText: string;
  setSearchText: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  /** メーカー名（未設定・不明は undefined） */
  manufacturerNameOf: (target: Equipment) => string | undefined;
  /** 機器に紐づく点検項目数 */
  inspectionItemCountOf: (target: Equipment) => number;
  /** 機器の最も近い次回期限（非稼働は無条件で— / 有効項目なしも—。screen-design §2「最も近い次回期限」） */
  nearestDueDateOf: (target: Equipment) => string;
};

/** 機器一覧の store 購読・検索/状態フィルタ・行表示用の導出値一式 */
export const useEquipmentList = (): UseEquipmentListResult => {
  const equipment = useAppStore((state) => state.equipment);
  const vendors = useAppStore((state) => state.vendors);
  const inspectionItems = useAppStore((state) => state.inspectionItems);

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

  const inspectionItemCountOf = (target: Equipment): number =>
    inspectionItemsOf({ inspectionItems }, target.id).length;

  const nearestDueDateOf = (target: Equipment): string => {
    if (target.status !== EQUIPMENT_STATUS.ACTIVE) return "—";
    const dueDates = inspectionItemsOf({ inspectionItems }, target.id)
      .filter((inspectionItem) => inspectionItem.isActive)
      .map((inspectionItem) => inspectionItem.nextDueDate);
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
    inspectionItemCountOf,
    nearestDueDateOf,
  };
};
