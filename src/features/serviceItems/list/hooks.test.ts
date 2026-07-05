/**
 * 項目一覧(screen-design/05-service-item-list.md)固有のフィルタ解釈・適用ロジックの検証。
 * 行導出(serviceItemRowsOf)の検証は昇格先の store/selectors.test.ts に移設済み(D-024)。
 * today は serviceItemRowsOf の引数注入なので固定日付で決定的にする(flakiness 回避)。
 * URLクエリ=フィルタ真実源(D-022)を扱う。
 */

import { SERVICE_ITEM_STATUS } from "@/domain/serviceItemStatus";
import {
  FILTER_ALL,
  filterServiceItemRows,
  parseServiceItemListFilters,
  type ServiceItemListFilters,
} from "@/features/serviceItems/list/hooks";
import { serviceItemRowsOf, type ServiceItemRow } from "@/store/selectors";
import { EXECUTION, SERVICE_ITEM_TYPE } from "@/store/types";
import {
  activePerson,
  calibrator,
  ids,
  inactivePerson,
  makeServiceItem,
  makeState,
  TODAY,
  toRecord,
} from "@/test/serviceItemRowFixtures";
import { describe, expect, it } from "vitest";

const ALL_FILTERS: ServiceItemListFilters = {
  status: FILTER_ALL,
  type: FILTER_ALL,
  execution: FILTER_ALL,
  personId: FILTER_ALL,
};

describe("parseServiceItemListFilters", () => {
  const persons = toRecord([activePerson]);
  const parse = (query: string): ServiceItemListFilters =>
    parseServiceItemListFilters(new URLSearchParams(query), persons);

  it("全パラメータ欠落なら全て all", () => {
    expect(parse("")).toEqual(ALL_FILTERS);
  });

  it("status: 正常値はその値、不正値は all", () => {
    expect(parse("status=overdue").status).toBe(SERVICE_ITEM_STATUS.OVERDUE);
    expect(parse("status=bogus").status).toBe(FILTER_ALL);
  });

  it("type: 正常値はその値、不正値は all", () => {
    expect(parse("type=calibration").type).toBe(SERVICE_ITEM_TYPE.CALIBRATION);
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

describe("filterServiceItemRows", () => {
  // i-ext(nextDueDate 2027) が i-int(2099) より先に並ぶ。両者とも status=ok。
  const rows: ServiceItemRow[] = serviceItemRowsOf(
    makeState([
      makeServiceItem({
        id: "i-int",
        type: SERVICE_ITEM_TYPE.INSPECTION,
        execution: EXECUTION.INTERNAL,
      }),
      makeServiceItem({
        id: "i-ext",
        type: SERVICE_ITEM_TYPE.CALIBRATION,
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
    expect(ids(filterServiceItemRows(rows, ALL_FILTERS))).toEqual(["i-ext", "i-int"]);
  });

  it("type 単独", () => {
    expect(
      ids(filterServiceItemRows(rows, { ...ALL_FILTERS, type: SERVICE_ITEM_TYPE.CALIBRATION })),
    ).toEqual(["i-ext"]);
  });

  it("execution 単独", () => {
    expect(
      ids(filterServiceItemRows(rows, { ...ALL_FILTERS, execution: EXECUTION.INTERNAL })),
    ).toEqual(["i-int"]);
  });

  it("personId 単独", () => {
    expect(
      ids(filterServiceItemRows(rows, { ...ALL_FILTERS, personId: inactivePerson.id })),
    ).toEqual(["i-ext"]);
  });

  it("status は導出済み row.status に適用", () => {
    expect(
      ids(filterServiceItemRows(rows, { ...ALL_FILTERS, status: SERVICE_ITEM_STATUS.OK })),
    ).toEqual(["i-ext", "i-int"]);
    expect(
      filterServiceItemRows(rows, { ...ALL_FILTERS, status: SERVICE_ITEM_STATUS.OVERDUE }),
    ).toHaveLength(0);
  });

  it("複合(AND): 全条件を満たす行のみ", () => {
    expect(
      ids(
        filterServiceItemRows(rows, {
          ...ALL_FILTERS,
          type: SERVICE_ITEM_TYPE.CALIBRATION,
          execution: EXECUTION.EXTERNAL,
          personId: inactivePerson.id,
        }),
      ),
    ).toEqual(["i-ext"]);
    expect(
      filterServiceItemRows(rows, {
        ...ALL_FILTERS,
        type: SERVICE_ITEM_TYPE.CALIBRATION,
        execution: EXECUTION.INTERNAL,
      }),
    ).toHaveLength(0);
  });
});
