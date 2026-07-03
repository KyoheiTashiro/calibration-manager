/**
 * 項目一覧画面(screen-design/05-inspection-item-list.md)固有のフィルタ解釈・適用ロジック。
 * UI(index.tsx)を薄いビューに保つため純関数へ切り出す(coding-standards.md §2)。
 * 行導出(inspectionItemRowsOf)はダッシュボードと共有する横断 selector のため store/selectors.ts に置く(D-024)。
 *
 * - フィルタの真実源は URL クエリ(D-022)。不正・未知値は「全て」扱いでエラーにしない。
 * - 表示対象は稼働(active)機器の有効(isActive=true)項目のみ。無効・非稼働トグルは不実装(D-023)。
 * - ステータスは保存値ではなく導出値(inspectionItemRowsOf 内 deriveInspectionItemStatus)。フィルタ status も導出結果に適用(§5)。
 */

import { INSPECTION_ITEM_STATUS, type InspectionItemStatus } from "@/domain/inspectionItemStatus";
import type { InspectionItemRow } from "@/store/selectors";
import { EXECUTION, INSPECTION_ITEM_TYPE, type Execution, type InspectionItemType, type Person } from "@/store/types";

/** フィルタ「全て」のセンチネル値 */
export const FILTER_ALL = "all" as const;

export type InspectionItemListFilters = {
  status: InspectionItemStatus | typeof FILTER_ALL;
  type: InspectionItemType | typeof FILTER_ALL;
  execution: Execution | typeof FILTER_ALL;
  personId: string | typeof FILTER_ALL; // Person.id または "all"
};

const INSPECTION_ITEM_STATUS_VALUES = new Set<string>(Object.values(INSPECTION_ITEM_STATUS));
const INSPECTION_ITEM_TYPE_VALUES = new Set<string>(Object.values(INSPECTION_ITEM_TYPE));
const EXECUTION_VALUES = new Set<string>(Object.values(EXECUTION));

/** クエリ値が許可集合に含まれればその値を、そうでなければ "all" を返す共通ヘルパ(D-022) */
const readEnumParam = <Enum extends string>(
  raw: string | null,
  allowed: ReadonlySet<string>,
): Enum | typeof FILTER_ALL => (raw !== null && allowed.has(raw) ? (raw as Enum) : FILTER_ALL);

/**
 * URLクエリ(?status=&type=&execution=&personId=)を InspectionItemListFilters へ解釈する。
 * 不正・未知の値、persons に存在しない personId は "all" 扱い(D-022。エラーにしない)。
 */
export const parseInspectionItemListFilters = (
  params: URLSearchParams,
  persons: Record<string, Person>,
): InspectionItemListFilters => {
  const personId = params.get("personId");
  return {
    status: readEnumParam<InspectionItemStatus>(params.get("status"), INSPECTION_ITEM_STATUS_VALUES),
    type: readEnumParam<InspectionItemType>(params.get("type"), INSPECTION_ITEM_TYPE_VALUES),
    execution: readEnumParam<Execution>(params.get("execution"), EXECUTION_VALUES),
    personId: personId !== null && personId in persons ? personId : FILTER_ALL,
  };
};

/** いずれかのフィルタが適用中か(空状態の文言分岐・クリアボタン表示に使う) */
export const hasActiveFilter = (filters: InspectionItemListFilters): boolean =>
  filters.status !== FILTER_ALL ||
  filters.type !== FILTER_ALL ||
  filters.execution !== FILTER_ALL ||
  filters.personId !== FILTER_ALL;

/**
 * フィルタ適用。status フィルタは導出済み row.status に対して適用(§5 表示ルール)。
 * 行導出(inspectionItemRowsOf)はダッシュボードと共有するため store/selectors.ts に置く(D-024)。
 */
export const filterInspectionItemRows = (rows: readonly InspectionItemRow[], filters: InspectionItemListFilters): InspectionItemRow[] =>
  rows.filter(
    (row) =>
      (filters.status === FILTER_ALL || row.status === filters.status) &&
      (filters.type === FILTER_ALL || row.inspectionItem.type === filters.type) &&
      (filters.execution === FILTER_ALL || row.inspectionItem.execution === filters.execution) &&
      (filters.personId === FILTER_ALL || row.inspectionItem.personId === filters.personId),
  );
