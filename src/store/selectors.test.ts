import { INSPECTION_ITEM_STATUS } from "@/domain/inspectionItemStatus";
import {
  inspectionItemRowsOf,
  inspectionItemsOf,
  ordersOf,
  recordsOf,
  unreadNotificationCount,
} from "@/store/selectors";
import {
  EXECUTION,
  ORDER_STATUS,
  type CalibrationOrder,
  type InspectionItem,
  type InspectionRecord,
  type Notification,
} from "@/store/types";
import {
  calibrator,
  eqSuspended,
  eqRetired,
  ids,
  inactivePerson,
  makeInspectionItem,
  makeState,
  TODAY,
} from "@/test/inspectionItemRowFixtures";
import { describe, expect, it } from "vitest";

describe("inspectionItemsOf", () => {
  it("指定equipmentIdに属する項目のみを抽出する", () => {
    const inspectionItems: Record<string, InspectionItem> = {
      "item-1": {
        id: "item-1",
        equipmentId: "equipment-1",
        type: "calibration",
        name: "年次校正",
        cycle: "1Y",
        execution: "internal",
        bufferDays: 14,
        personId: "person-1",
        noticeDaysBefore: 30,
        nextDueDate: "2026-12-31",
        isActive: true,
      },
      "item-2": {
        id: "item-2",
        equipmentId: "equipment-2",
        type: "inspection",
        name: "月次点検",
        cycle: "1M",
        execution: "internal",
        bufferDays: 14,
        personId: "person-1",
        noticeDaysBefore: 30,
        nextDueDate: "2026-08-01",
        isActive: true,
      },
    };

    expect(inspectionItemsOf({ inspectionItems }, "equipment-1")).toEqual([
      inspectionItems["item-1"],
    ]);
  });

  it("該当する項目が無ければ空配列を返す", () => {
    expect(inspectionItemsOf({ inspectionItems: {} }, "equipment-1")).toEqual([]);
  });
});

describe("ordersOf", () => {
  it("指定inspectionItemIdに属する案件のみを抽出する", () => {
    const orders: Record<string, CalibrationOrder> = {
      "order-1": {
        id: "order-1",
        inspectionItemId: "item-1",
        vendorId: "vendor-1",
        status: "planned",
      },
      "order-2": {
        id: "order-2",
        inspectionItemId: "item-2",
        vendorId: "vendor-1",
        status: "ordered",
      },
    };

    expect(ordersOf({ orders }, "item-1")).toEqual([orders["order-1"]]);
  });

  it("該当する案件が無ければ空配列を返す", () => {
    expect(ordersOf({ orders: {} }, "item-1")).toEqual([]);
  });
});

describe("recordsOf", () => {
  it("doneDateの降順で並び、同日はidの昇順で決定的に並ぶ", () => {
    const records: Record<string, InspectionRecord> = {
      "record-b": {
        id: "record-b",
        inspectionItemId: "item-1",
        doneDate: "2026-06-01",
        doneBy: "田中",
        result: "pass",
      },
      "record-a": {
        id: "record-a",
        inspectionItemId: "item-1",
        doneDate: "2026-06-01",
        doneBy: "鈴木",
        result: "pass",
      },
      "record-newest": {
        id: "record-newest",
        inspectionItemId: "item-1",
        doneDate: "2026-07-01",
        doneBy: "佐藤",
        result: "pass",
      },
      "record-other-item": {
        id: "record-other-item",
        inspectionItemId: "item-2",
        doneDate: "2026-07-15",
        doneBy: "高橋",
        result: "pass",
      },
    };

    expect(recordsOf({ records }, "item-1")).toEqual([
      records["record-newest"],
      records["record-a"],
      records["record-b"],
    ]);
  });

  it("該当する実施記録が無ければ空配列を返す", () => {
    expect(recordsOf({ records: {} }, "item-1")).toEqual([]);
  });
});

describe("unreadNotificationCount", () => {
  it("isReadがfalseの通知の件数のみを数える", () => {
    const notifications: Record<string, Notification> = {
      "notification-1": {
        id: "notification-1",
        type: "dueSoon",
        targetType: "inspectionItem",
        targetId: "item-1",
        personId: "person-1",
        message: "期限が近づいています",
        createdDate: "2026-06-01",
        isRead: false,
      },
      "notification-2": {
        id: "notification-2",
        type: "overdue",
        targetType: "inspectionItem",
        targetId: "item-2",
        personId: "person-1",
        message: "期限が過ぎています",
        createdDate: "2026-06-02",
        isRead: true,
      },
      "notification-3": {
        id: "notification-3",
        type: "orderRecommended",
        targetType: "inspectionItem",
        targetId: "item-3",
        personId: "person-2",
        message: "発注を推奨します",
        createdDate: "2026-06-03",
        isRead: false,
      },
    };

    expect(unreadNotificationCount({ notifications })).toBe(2);
  });

  it("通知が0件なら0を返す", () => {
    expect(unreadNotificationCount({ notifications: {} })).toBe(0);
  });
});

/**
 * inspectionItemRowsOf(横断 selector。features/inspectionItems/list/hooks.ts から昇格、D-024/coding-standards §5)の検証。
 * 固定データは @/test/inspectionItemRowFixtures に集約(項目一覧フィルタのテストと共有)。
 * 無効非稼働除外(D-023)・personLabelOf(D-001)・発注推奨日(§4.2)の導出を扱う。
 */
describe("inspectionItemRowsOf: 対象の絞り込み・並び順", () => {
  it("非稼働機器(休止/廃棄)の項目・isActive=false 項目・dangling機器の項目を除外する", () => {
    const state = makeState([
      makeInspectionItem({ id: "keep" }),
      makeInspectionItem({ id: "on-suspended", equipmentId: eqSuspended.id }),
      makeInspectionItem({ id: "on-retired", equipmentId: eqRetired.id }),
      makeInspectionItem({ id: "inactive", isActive: false }),
      makeInspectionItem({ id: "dangling-eq", equipmentId: "eq-missing" }),
    ]);
    expect(ids(inspectionItemRowsOf(state, TODAY))).toEqual(["keep"]);
  });

  it("nextDueDate 昇順、同値は inspectionItem.id 昇順", () => {
    const state = makeState([
      makeInspectionItem({ id: "b", nextDueDate: "2026-05-01" }),
      makeInspectionItem({ id: "a", nextDueDate: "2026-05-01" }),
      makeInspectionItem({ id: "c", nextDueDate: "2026-01-01" }),
    ]);
    expect(ids(inspectionItemRowsOf(state, TODAY))).toEqual(["c", "a", "b"]);
  });
});

describe("inspectionItemRowsOf: status 導出", () => {
  it("期限超過は overdue", () => {
    const state = makeState([makeInspectionItem({ id: "od", nextDueDate: "2026-01-01" })]);
    const [row] = inspectionItemRowsOf(state, TODAY);
    expect(row.status).toBe(INSPECTION_ITEM_STATUS.OVERDUE);
  });

  it("外部・leadTimeDays 未設定で vendor.standardLeadTimeDays フォールバック経由の orderNow", () => {
    // 推奨日 = 2026-08-01 − 20(vendor) − 14 = 2026-06-28 ≤ TODAY(2026-07-03) かつ有効案件なし
    const state = makeState([
      makeInspectionItem({
        id: "on",
        execution: EXECUTION.EXTERNAL,
        vendorId: calibrator.id,
        leadTimeDays: undefined,
        bufferDays: 14,
        nextDueDate: "2026-08-01",
      }),
    ]);
    const [row] = inspectionItemRowsOf(state, TODAY);
    expect(row.status).toBe(INSPECTION_ITEM_STATUS.ORDER_NOW);
    expect(row.recommendedOrderDate).toBe("2026-06-28");
  });

  it("内部実施は recommendedOrderDate が null(発注の概念がない)", () => {
    const state = makeState([makeInspectionItem({ id: "int", execution: EXECUTION.INTERNAL })]);
    const [row] = inspectionItemRowsOf(state, TODAY);
    expect(row.recommendedOrderDate).toBeNull();
  });

  it("外部でも参照先 Vendor が存在しない(dangling)なら納期解決不可で recommendedOrderDate は null", () => {
    // vendorId は設定されているが vendors に該当なし → vendor=null。leadTimeDays 未設定のため解決不可
    const state = makeState([
      makeInspectionItem({
        id: "dangling-vendor",
        execution: EXECUTION.EXTERNAL,
        vendorId: "v-missing",
        leadTimeDays: undefined,
        nextDueDate: "2027-01-01",
      }),
    ]);
    const [row] = inspectionItemRowsOf(state, TODAY);
    expect(row.inspectionItem.id).toBe("dangling-vendor");
    expect(row.recommendedOrderDate).toBeNull();
  });
});

describe("inspectionItemRowsOf: canCreateOrder", () => {
  const externalInspectionItem = makeInspectionItem({
    id: "ext",
    execution: EXECUTION.EXTERNAL,
    vendorId: calibrator.id,
    leadTimeDays: 20,
    nextDueDate: "2027-01-01",
  });

  it("外部かつ有効案件なしなら true", () => {
    const [row] = inspectionItemRowsOf(makeState([externalInspectionItem]), TODAY);
    expect(row.canCreateOrder).toBe(true);
  });

  it("外部でも有効案件があれば false", () => {
    const order: CalibrationOrder = {
      id: "o-1",
      inspectionItemId: externalInspectionItem.id,
      vendorId: calibrator.id,
      status: ORDER_STATUS.ORDERED,
    };
    const [row] = inspectionItemRowsOf(makeState([externalInspectionItem], [order]), TODAY);
    expect(row.canCreateOrder).toBe(false);
  });

  it("内部項目は常に false", () => {
    const [row] = inspectionItemRowsOf(makeState([makeInspectionItem({ id: "int" })]), TODAY);
    expect(row.canCreateOrder).toBe(false);
  });
});

describe("inspectionItemRowsOf: personLabel(D-001)", () => {
  it("dangling(参照先なし)は「—」、無効担当者は「(無効)」注記", () => {
    const state = makeState([
      makeInspectionItem({ id: "dangling-person", personId: "p-missing" }),
      makeInspectionItem({ id: "inactive-person", personId: inactivePerson.id }),
    ]);
    const byId = Object.fromEntries(
      inspectionItemRowsOf(state, TODAY).map((row) => [row.inspectionItem.id, row]),
    );
    expect(byId["dangling-person"]?.personLabel).toBe("—");
    expect(byId["inactive-person"]?.personLabel).toBe("鈴木(無効)");
  });
});
