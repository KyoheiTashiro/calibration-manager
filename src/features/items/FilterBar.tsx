/**
 * 項目一覧(screen-design/05-item-list.md)のフィルタ行。
 * 4つのSelect(状態/種別/内外/担当)と「クリア」ボタンからなる薄いビュー。
 * フィルタの真実源はURLクエリ(D-022)であり、値の保持・更新は親(index.tsx)の責務。
 * ここでは選択肢の組み立てと変更イベントの通知のみを行う。
 */

import { Button, Select } from "@/components/ui";
import { ITEM_STATUS } from "@/domain/itemStatus";
import { statusBadgeLabel } from "@/domain/statusBadge";
import { EXECUTION_OPTIONS, ITEM_TYPE_OPTIONS } from "@/features/items/constants";
import { FILTER_ALL, type ItemListFilters } from "@/features/items/hooks";
import { personLabelOf } from "@/store/selectors";
import type { Person } from "@/store/types";
import type { ReactElement } from "react";

type SelectOption = { value: string; label: string };

/** 「全て」を先頭に付けた選択肢を作る(全Selectの共通形) */
const withAllOption = (options: readonly SelectOption[]): SelectOption[] => [
  { value: FILTER_ALL, label: "全て" },
  ...options,
];

/** 状態フィルタ: §0.3の5値を statusBadgeLabel の日本語で(導出結果に適用、§5) */
const STATUS_OPTIONS: SelectOption[] = withAllOption(
  Object.values(ITEM_STATUS).map((status) => ({ value: status, label: statusBadgeLabel(status) })),
);
const TYPE_OPTIONS: SelectOption[] = withAllOption(ITEM_TYPE_OPTIONS);
const EXECUTION_FILTER_OPTIONS: SelectOption[] = withAllOption(EXECUTION_OPTIONS);

type Props = {
  filters: ItemListFilters;
  persons: Record<string, Person>;
  /** キーは query パラメータ名と一対一(status/type/execution/personId)。値が FILTER_ALL なら親が除去する */
  onFilterChange: (key: keyof ItemListFilters, value: string) => void;
  onClear: () => void;
};

export const FilterBar = ({ filters, persons, onFilterChange, onClear }: Props): ReactElement => {
  // 担当: name 昇順、無効者は personLabelOf で「(無効)」注記(D-001)
  const personOptions: SelectOption[] = withAllOption(
    Object.values(persons)
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map((person) => ({ value: person.id, label: personLabelOf({ persons }, person.id) })),
  );

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="w-40">
        <Select
          label="状態"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(event) => onFilterChange("status", event.target.value)}
        />
      </div>
      <div className="w-32">
        <Select
          label="種別"
          options={TYPE_OPTIONS}
          value={filters.type}
          onChange={(event) => onFilterChange("type", event.target.value)}
        />
      </div>
      <div className="w-32">
        <Select
          label="内外"
          options={EXECUTION_FILTER_OPTIONS}
          value={filters.execution}
          onChange={(event) => onFilterChange("execution", event.target.value)}
        />
      </div>
      <div className="w-40">
        <Select
          label="担当"
          options={personOptions}
          value={filters.personId}
          onChange={(event) => onFilterChange("personId", event.target.value)}
        />
      </div>
      <Button variant="secondary" onClick={onClear}>
        クリア
      </Button>
    </div>
  );
};
