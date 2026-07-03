/**
 * 項目一覧画面(screen-design/05-item-list.md)のフィルタ解釈・行導出ロジック。
 * UI(index.tsx)を薄いビューに保つため純関数へ切り出す(coding-standards.md §2)。
 *
 * - フィルタの真実源は URL クエリ(D-022)。不正・未知値は「全て」扱いでエラーにしない。
 * - 表示対象は稼働(active)機器の有効(isActive=true)項目のみ。無効・非稼働トグルは不実装(D-023)。
 * - ステータスは保存値ではなく deriveItemStatus による導出値。フィルタ status も導出結果に適用(§5)。
 */

import { deriveItemStatus, ITEM_STATUS, type ItemStatus } from "@/domain/itemStatus";
import { recommendedOrderDate } from "@/domain/leadTime";
import { isActiveOrderStatus } from "@/domain/orderStatus";
import { ordersOf, personLabelOf } from "@/store/selectors";
import {
  EQUIPMENT_STATUS,
  EXECUTION,
  ITEM_TYPE,
  type AppState,
  type CalibrationOrder,
  type Equipment,
  type Execution,
  type InspectionItem,
  type IsoDateString,
  type ItemType,
  type Person,
} from "@/store/types";

/** フィルタ「全て」のセンチネル値 */
export const FILTER_ALL = "all" as const;

export type ItemListFilters = {
  status: ItemStatus | typeof FILTER_ALL;
  type: ItemType | typeof FILTER_ALL;
  execution: Execution | typeof FILTER_ALL;
  personId: string | typeof FILTER_ALL; // Person.id または "all"
};

const ITEM_STATUS_VALUES = new Set<string>(Object.values(ITEM_STATUS));
const ITEM_TYPE_VALUES = new Set<string>(Object.values(ITEM_TYPE));
const EXECUTION_VALUES = new Set<string>(Object.values(EXECUTION));

/** クエリ値が許可集合に含まれればその値を、そうでなければ "all" を返す共通ヘルパ(D-022) */
const readEnumParam = <Enum extends string>(
  raw: string | null,
  allowed: ReadonlySet<string>,
): Enum | typeof FILTER_ALL => (raw !== null && allowed.has(raw) ? (raw as Enum) : FILTER_ALL);

/**
 * URLクエリ(?status=&type=&execution=&personId=)を ItemListFilters へ解釈する。
 * 不正・未知の値、persons に存在しない personId は "all" 扱い(D-022。エラーにしない)。
 */
export const parseItemListFilters = (
  params: URLSearchParams,
  persons: Record<string, Person>,
): ItemListFilters => {
  const personId = params.get("personId");
  return {
    status: readEnumParam<ItemStatus>(params.get("status"), ITEM_STATUS_VALUES),
    type: readEnumParam<ItemType>(params.get("type"), ITEM_TYPE_VALUES),
    execution: readEnumParam<Execution>(params.get("execution"), EXECUTION_VALUES),
    personId: personId !== null && personId in persons ? personId : FILTER_ALL,
  };
};

/** いずれかのフィルタが適用中か(空状態の文言分岐・クリアボタン表示に使う) */
export const hasActiveFilter = (filters: ItemListFilters): boolean =>
  filters.status !== FILTER_ALL ||
  filters.type !== FILTER_ALL ||
  filters.execution !== FILTER_ALL ||
  filters.personId !== FILTER_ALL;

/** 項目一覧の1行(表示に必要な導出値を同梱) */
export type ItemRow = {
  item: InspectionItem;
  equipment: Equipment;
  status: ItemStatus; // deriveItemStatus による導出値
  personLabel: string; // personLabelOf(D-001: dangling「—」、無効「(無効)」注記)
  recommendedOrderDate: IsoDateString | null; // recommendedOrderDate(§4.2)。内部・算出不能は null
  canCreateOrder: boolean; // external かつ 有効な案件(isActiveOrderStatus)なし
};

/** 表示順: nextDueDate 昇順、同値は item.id 昇順(§5 既定並び) */
const compareRows = (left: ItemRow, right: ItemRow): number =>
  left.item.nextDueDate.localeCompare(right.item.nextDueDate) ||
  left.item.id.localeCompare(right.item.id);

/**
 * 表示対象行を構築する。対象は status=active 機器の isActive=true 項目のみ(D-023)。
 * 参照先機器のない項目(dangling)は行にしない。並びは nextDueDate 昇順、同値は item.id 昇順。
 */
export const buildItemRows = (
  state: Pick<AppState, "items" | "equipment" | "orders" | "vendors" | "persons">,
  today: IsoDateString,
): ItemRow[] => {
  const rows: ItemRow[] = [];
  for (const item of Object.values(state.items)) {
    if (!item.isActive) continue;
    const equipment = state.equipment[item.equipmentId];
    if (equipment === undefined) continue; // dangling: 参照先機器なし
    if (equipment.status !== EQUIPMENT_STATUS.ACTIVE) continue;

    const vendor = item.vendorId ? (state.vendors[item.vendorId] ?? null) : null;
    const itemOrders: CalibrationOrder[] = ordersOf({ orders: state.orders }, item.id);
    const isExternal = item.execution === EXECUTION.EXTERNAL;

    rows.push({
      item,
      equipment,
      status: deriveItemStatus(item, itemOrders, vendor, today),
      personLabel: personLabelOf({ persons: state.persons }, item.personId),
      recommendedOrderDate: recommendedOrderDate(item, vendor),
      canCreateOrder: isExternal && !itemOrders.some((order) => isActiveOrderStatus(order.status)),
    });
  }
  return rows.toSorted(compareRows);
};

/** フィルタ適用。status フィルタは導出済み row.status に対して適用(§5 表示ルール) */
export const filterItemRows = (rows: readonly ItemRow[], filters: ItemListFilters): ItemRow[] =>
  rows.filter(
    (row) =>
      (filters.status === FILTER_ALL || row.status === filters.status) &&
      (filters.type === FILTER_ALL || row.item.type === filters.type) &&
      (filters.execution === FILTER_ALL || row.item.execution === filters.execution) &&
      (filters.personId === FILTER_ALL || row.item.personId === filters.personId),
  );
