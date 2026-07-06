/**
 * フィルタの真実源はURLクエリ(D-022)であり、値の保持・更新は親(index.tsx)の責務。
 */

import { Button, Select } from "@/components/ui";
import { SERVICE_ITEM_STATUS } from "@/domain/serviceItemStatus";
import { statusBadgeLabel } from "@/domain/statusBadge";
import { EXECUTION_OPTIONS, SERVICE_ITEM_TYPE_OPTIONS } from "@/features/serviceItems/constants";
import { FILTER_ALL, type ServiceItemListFilters } from "@/features/serviceItems/list/hooks";
import { personLabelOf } from "@/store/selectors";
import type { Person } from "@/store/types";
import type { ReactElement } from "react";

type SelectOption = { value: string; label: string };

const withAllOption = (options: readonly SelectOption[]): SelectOption[] => [
  { value: FILTER_ALL, label: "全て" },
  ...options,
];

const STATUS_OPTIONS: SelectOption[] = withAllOption(
  Object.values(SERVICE_ITEM_STATUS).map((status) => ({
    value: status,
    label: statusBadgeLabel(status),
  })),
);
const TYPE_OPTIONS: SelectOption[] = withAllOption(SERVICE_ITEM_TYPE_OPTIONS);
const EXECUTION_FILTER_OPTIONS: SelectOption[] = withAllOption(EXECUTION_OPTIONS);

type Props = {
  filters: ServiceItemListFilters;
  persons: Record<string, Person>;
  /** キーは query パラメータ名と一対一(status/type/execution/personId)。値が FILTER_ALL なら親が除去する */
  onFilterChange: (key: keyof ServiceItemListFilters, value: string) => void;
  onClear: () => void;
};

export const FilterBar = ({ filters, persons, onFilterChange, onClear }: Props): ReactElement => {
  // 無効者は personLabelOf で「(無効)」注記(D-001)
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
          onChange={(event) => {
            onFilterChange("status", event.target.value);
          }}
        />
      </div>
      <div className="w-32">
        <Select
          label="種別"
          options={TYPE_OPTIONS}
          value={filters.type}
          onChange={(event) => {
            onFilterChange("type", event.target.value);
          }}
        />
      </div>
      <div className="w-32">
        <Select
          label="内外"
          options={EXECUTION_FILTER_OPTIONS}
          value={filters.execution}
          onChange={(event) => {
            onFilterChange("execution", event.target.value);
          }}
        />
      </div>
      <div className="w-40">
        <Select
          label="担当"
          options={personOptions}
          value={filters.personId}
          onChange={(event) => {
            onFilterChange("personId", event.target.value);
          }}
        />
      </div>
      <Button variant="secondary" onClick={onClear}>
        クリア
      </Button>
    </div>
  );
};
