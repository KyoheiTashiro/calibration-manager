import type { Person } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { useMemo, useState } from 'react';

/**
 * 「全て」という複合値を持つ表示用フィルタのため、ドメイン定数には追加せず
 * このファイルに閉じたモジュールレベル定数とする(機器一覧の StatusFilter と同パターン)。
 */
const STATUS_FILTER = {
  ALL: 'all',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
export type StatusFilter = (typeof STATUS_FILTER)[keyof typeof STATUS_FILTER];

export const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: STATUS_FILTER.ALL, label: '全て' },
  { value: STATUS_FILTER.ACTIVE, label: '有効' },
  { value: STATUS_FILTER.INACTIVE, label: '無効' },
];

/**
 * 文字列が StatusFilter か判定する実行時型ガード。<select> の onChange イベント値は
 * 型上ただの string のため、options に実在する値かを検証してから絞り込む。
 */
export const isStatusFilter = (value: string): value is StatusFilter =>
  STATUS_FILTER_OPTIONS.some((option) => option.value === value);

const matchesStatusFilter = (person: Person, filter: StatusFilter): boolean => {
  if (filter === STATUS_FILTER.ALL) return true;
  return filter === STATUS_FILTER.ACTIVE ? person.isActive : !person.isActive;
};

const matchesSearch = (person: Person, normalizedSearch: string): boolean => {
  if (normalizedSearch === '') return true;
  const haystack = [person.name, person.department ?? '', person.email].join('\n').toLowerCase();
  return haystack.includes(normalizedSearch);
};

type UsePersonListResult = {
  totalCount: number;
  filteredPersonList: Person[];
  searchText: string;
  setSearchText: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
};

export const usePersonList = (): UsePersonListResult => {
  const persons = useAppStore((state) => state.persons);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_FILTER.ALL);

  const totalCount = Object.keys(persons).length;

  const filteredPersonList = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return Object.values(persons)
      .filter((entry) => matchesStatusFilter(entry, statusFilter))
      .filter((entry) => matchesSearch(entry, normalizedSearch))
      .toSorted((left, right) => left.name.localeCompare(right.name, 'ja'));
  }, [persons, searchText, statusFilter]);

  return {
    totalCount,
    filteredPersonList,
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
  };
};
