/**
 * 項目一覧(screen-design/05-item-list.md)のフィルタ解釈・行導出ロジックの検証。
 * today は buildItemRows の引数注入なので固定日付で決定的にする(flakiness 回避)。
 * URLクエリ=フィルタ真実源(D-022)・無効非稼働除外(D-023)・personLabelOf(D-001)を扱う。
 */

import { ITEM_STATUS } from "@/domain/itemStatus";
import {
  buildItemRows,
  FILTER_ALL,
  filterItemRows,
  hasActiveFilter,
  parseItemListFilters,
  type ItemListFilters,
  type ItemRow,
} from "@/features/items/hooks";
import {
  EQUIPMENT_STATUS,
  EXECUTION,
  ITEM_TYPE,
  ORDER_STATUS,
  type AppState,
  type CalibrationOrder,
  type Equipment,
  type InspectionItem,
  type Person,
  type Vendor,
} from "@/store/types";
import { describe, expect, it } from "vitest";

const TODAY = "2026-07-03";

const activePerson: Person = { id: "p-active", name: "田中", email: "a@x.jp", isActive: true };
const inactivePerson: Person = { id: "p-inactive", name: "鈴木", email: "b@x.jp", isActive: false };

const eqActive: Equipment = { id: "eq-active", managementNo: "EQ-1", name: "ノギス", status: EQUIPMENT_STATUS.ACTIVE }; // prettier-ignore
const eqSuspended: Equipment = { id: "eq-susp", managementNo: "EQ-2", name: "はかり", status: EQUIPMENT_STATUS.SUSPENDED }; // prettier-ignore
const eqRetired: Equipment = { id: "eq-ret", managementNo: "EQ-3", name: "圧力計", status: EQUIPMENT_STATUS.RETIRED }; // prettier-ignore

const calibrator: Vendor = {
  id: "v-cal",
  name: "校正センター",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 20,
};

const ALL_FILTERS: ItemListFilters = {
  status: FILTER_ALL,
  type: FILTER_ALL,
  execution: FILTER_ALL,
  personId: FILTER_ALL,
};

const makeItem = (over: Partial<InspectionItem> & Pick<InspectionItem, "id">): InspectionItem => ({
  equipmentId: eqActive.id,
  type: ITEM_TYPE.INSPECTION,
  name: "点検",
  cycle: "1Y",
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: activePerson.id,
  noticeDaysBefore: 30,
  nextDueDate: "2099-01-01",
  isActive: true,
  ...over,
});

const toRecord = <Entry extends { id: string }>(list: readonly Entry[]): Record<string, Entry> =>
  Object.fromEntries(list.map((entry) => [entry.id, entry]));

const makeState = (
  items: readonly InspectionItem[],
  orders: readonly CalibrationOrder[] = [],
): Pick<AppState, "items" | "equipment" | "orders" | "vendors" | "persons"> => ({
  items: toRecord(items),
  equipment: toRecord([eqActive, eqSuspended, eqRetired]),
  orders: toRecord(orders),
  vendors: toRecord([calibrator]),
  persons: toRecord([activePerson, inactivePerson]),
});

const ids = (rows: readonly ItemRow[]): string[] => rows.map((row) => row.item.id);

describe("parseItemListFilters", () => {
  const persons = toRecord([activePerson]);
  const parse = (query: string): ItemListFilters =>
    parseItemListFilters(new URLSearchParams(query), persons);

  it("全パラメータ欠落なら全て all", () => {
    expect(parse("")).toEqual(ALL_FILTERS);
  });

  it("status: 正常値はその値、不正値は all", () => {
    expect(parse("status=overdue").status).toBe(ITEM_STATUS.OVERDUE);
    expect(parse("status=bogus").status).toBe(FILTER_ALL);
  });

  it("type: 正常値はその値、不正値は all", () => {
    expect(parse("type=calibration").type).toBe(ITEM_TYPE.CALIBRATION);
    expect(parse("type=bogus").type).toBe(FILTER_ALL);
  });

  it("execution: 正常値はその値、不正値は all", () => {
    expect(parse("execution=external").execution).toBe(EXECUTION.EXTERNAL);
    expect(parse("execution=bogus").execution).toBe(FILTER_ALL);
  });

  it("personId: persons に存在する id はその値、存在しない id は all", () => {
    expect(parse(`personId=${activePerson.id}`).personId).toBe(activePerson.id);
    expect(parse("personId=p-unknown").personId).toBe(FILTER_ALL);
  });
});

describe("hasActiveFilter", () => {
  it("全て all なら false", () => {
    expect(hasActiveFilter(ALL_FILTERS)).toBe(false);
  });

  it("いずれか1つでも指定されていれば true", () => {
    expect(hasActiveFilter({ ...ALL_FILTERS, status: ITEM_STATUS.OVERDUE })).toBe(true);
    expect(hasActiveFilter({ ...ALL_FILTERS, type: ITEM_TYPE.INSPECTION })).toBe(true);
    expect(hasActiveFilter({ ...ALL_FILTERS, execution: EXECUTION.INTERNAL })).toBe(true);
    expect(hasActiveFilter({ ...ALL_FILTERS, personId: activePerson.id })).toBe(true);
  });
});

describe("buildItemRows: 対象の絞り込み・並び順", () => {
  it("非稼働機器(休止/廃棄)の項目・isActive=false 項目・dangling機器の項目を除外する", () => {
    const state = makeState([
      makeItem({ id: "keep" }),
      makeItem({ id: "on-suspended", equipmentId: eqSuspended.id }),
      makeItem({ id: "on-retired", equipmentId: eqRetired.id }),
      makeItem({ id: "inactive", isActive: false }),
      makeItem({ id: "dangling-eq", equipmentId: "eq-missing" }),
    ]);
    expect(ids(buildItemRows(state, TODAY))).toEqual(["keep"]);
  });

  it("nextDueDate 昇順、同値は item.id 昇順", () => {
    const state = makeState([
      makeItem({ id: "b", nextDueDate: "2026-05-01" }),
      makeItem({ id: "a", nextDueDate: "2026-05-01" }),
      makeItem({ id: "c", nextDueDate: "2026-01-01" }),
    ]);
    expect(ids(buildItemRows(state, TODAY))).toEqual(["c", "a", "b"]);
  });
});

describe("buildItemRows: status 導出", () => {
  it("期限超過は overdue", () => {
    const state = makeState([makeItem({ id: "od", nextDueDate: "2026-01-01" })]);
    const [row] = buildItemRows(state, TODAY);
    expect(row?.status).toBe(ITEM_STATUS.OVERDUE);
  });

  it("外部・leadTimeDays 未設定で vendor.standardLeadTimeDays フォールバック経由の orderNow", () => {
    // 推奨日 = 2026-08-01 − 20(vendor) − 14 = 2026-06-28 ≤ TODAY(2026-07-03) かつ有効案件なし
    const state = makeState([
      makeItem({
        id: "on",
        execution: EXECUTION.EXTERNAL,
        vendorId: calibrator.id,
        leadTimeDays: undefined,
        bufferDays: 14,
        nextDueDate: "2026-08-01",
      }),
    ]);
    const [row] = buildItemRows(state, TODAY);
    expect(row?.status).toBe(ITEM_STATUS.ORDER_NOW);
    expect(row?.recommendedOrderDate).toBe("2026-06-28");
  });

  it("内部実施は recommendedOrderDate が null(発注の概念がない)", () => {
    const state = makeState([makeItem({ id: "int", execution: EXECUTION.INTERNAL })]);
    const [row] = buildItemRows(state, TODAY);
    expect(row?.recommendedOrderDate).toBeNull();
  });
});

describe("buildItemRows: canCreateOrder", () => {
  const externalItem = makeItem({
    id: "ext",
    execution: EXECUTION.EXTERNAL,
    vendorId: calibrator.id,
    leadTimeDays: 20,
    nextDueDate: "2027-01-01",
  });

  it("外部かつ有効案件なしなら true", () => {
    const [row] = buildItemRows(makeState([externalItem]), TODAY);
    expect(row?.canCreateOrder).toBe(true);
  });

  it("外部でも有効案件があれば false", () => {
    const order: CalibrationOrder = {
      id: "o-1",
      itemId: externalItem.id,
      vendorId: calibrator.id,
      status: ORDER_STATUS.ORDERED,
    };
    const [row] = buildItemRows(makeState([externalItem], [order]), TODAY);
    expect(row?.canCreateOrder).toBe(false);
  });

  it("内部項目は常に false", () => {
    const [row] = buildItemRows(makeState([makeItem({ id: "int" })]), TODAY);
    expect(row?.canCreateOrder).toBe(false);
  });
});

describe("buildItemRows: personLabel(D-001)", () => {
  it("dangling(参照先なし)は「—」、無効担当者は「(無効)」注記", () => {
    const state = makeState([
      makeItem({ id: "dangling-person", personId: "p-missing" }),
      makeItem({ id: "inactive-person", personId: inactivePerson.id }),
    ]);
    const byId = Object.fromEntries(buildItemRows(state, TODAY).map((row) => [row.item.id, row]));
    expect(byId["dangling-person"]?.personLabel).toBe("—");
    expect(byId["inactive-person"]?.personLabel).toBe("鈴木(無効)");
  });
});

describe("filterItemRows", () => {
  // i-ext(nextDueDate 2027) が i-int(2099) より先に並ぶ。両者とも status=ok。
  const rows: ItemRow[] = buildItemRows(
    makeState([
      makeItem({ id: "i-int", type: ITEM_TYPE.INSPECTION, execution: EXECUTION.INTERNAL }),
      makeItem({
        id: "i-ext",
        type: ITEM_TYPE.CALIBRATION,
        execution: EXECUTION.EXTERNAL,
        vendorId: calibrator.id,
        leadTimeDays: 20,
        personId: inactivePerson.id,
        nextDueDate: "2027-01-01",
      }),
    ]),
    TODAY,
  );

  it("全て all は素通し(nextDueDate 昇順)", () => {
    expect(ids(filterItemRows(rows, ALL_FILTERS))).toEqual(["i-ext", "i-int"]);
  });

  it("type 単独", () => {
    expect(ids(filterItemRows(rows, { ...ALL_FILTERS, type: ITEM_TYPE.CALIBRATION }))).toEqual([
      "i-ext",
    ]);
  });

  it("execution 単独", () => {
    expect(ids(filterItemRows(rows, { ...ALL_FILTERS, execution: EXECUTION.INTERNAL }))).toEqual([
      "i-int",
    ]);
  });

  it("personId 単独", () => {
    expect(ids(filterItemRows(rows, { ...ALL_FILTERS, personId: inactivePerson.id }))).toEqual([
      "i-ext",
    ]);
  });

  it("status は導出済み row.status に適用", () => {
    expect(ids(filterItemRows(rows, { ...ALL_FILTERS, status: ITEM_STATUS.OK }))).toEqual([
      "i-ext",
      "i-int",
    ]);
    expect(filterItemRows(rows, { ...ALL_FILTERS, status: ITEM_STATUS.OVERDUE })).toHaveLength(0);
  });

  it("複合(AND): 全条件を満たす行のみ", () => {
    expect(
      ids(
        filterItemRows(rows, {
          ...ALL_FILTERS,
          type: ITEM_TYPE.CALIBRATION,
          execution: EXECUTION.EXTERNAL,
          personId: inactivePerson.id,
        }),
      ),
    ).toEqual(["i-ext"]);
    expect(
      filterItemRows(rows, {
        ...ALL_FILTERS,
        type: ITEM_TYPE.CALIBRATION,
        execution: EXECUTION.INTERNAL,
      }),
    ).toHaveLength(0);
  });
});
