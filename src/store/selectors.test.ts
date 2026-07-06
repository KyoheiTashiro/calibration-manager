import { SERVICE_ITEM_STATUS } from "@/domain/serviceItemStatus";
import {
  serviceItemRowsOf,
  serviceItemsOf,
  serviceOrdersOf,
  serviceRecordsOf,
  unreadNotificationCount,
} from "@/store/selectors";
import {
  EXECUTION,
  SERVICE_ORDER_STATUS,
  type ServiceOrder,
  type ServiceItem,
  type ServiceRecord,
  type Notification,
} from "@/store/types";
import {
  calibrator,
  eqSuspended,
  eqRetired,
  ids,
  inactivePerson,
  makeServiceItem,
  makeState,
  TODAY,
} from "@/test/serviceItemRowFixtures";
import { describe, expect, it } from "vitest";

describe("serviceItemsOf", () => {
  it("指定equipmentIdに属する項目のみを抽出する", () => {
    const serviceItems: Record<string, ServiceItem> = {
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

    expect(serviceItemsOf({ serviceItems }, "equipment-1")).toEqual([serviceItems["item-1"]]);
  });

  it("該当する項目が無ければ空配列を返す", () => {
    expect(serviceItemsOf({ serviceItems: {} }, "equipment-1")).toEqual([]);
  });
});

describe("serviceOrdersOf", () => {
  it("指定serviceItemIdに属する案件のみを抽出する", () => {
    const serviceOrders: Record<string, ServiceOrder> = {
      "serviceOrder-1": {
        id: "serviceOrder-1",
        serviceItemId: "item-1",
        vendorId: "vendor-1",
        status: "planned",
      },
      "serviceOrder-2": {
        id: "serviceOrder-2",
        serviceItemId: "item-2",
        vendorId: "vendor-1",
        status: "ordered",
      },
    };

    expect(serviceOrdersOf({ serviceOrders }, "item-1")).toEqual([serviceOrders["serviceOrder-1"]]);
  });

  it("該当する案件が無ければ空配列を返す", () => {
    expect(serviceOrdersOf({ serviceOrders: {} }, "item-1")).toEqual([]);
  });
});

describe("serviceRecordsOf", () => {
  it("doneDateの降順で並び、同日はidの昇順で決定的に並ぶ", () => {
    const serviceRecords: Record<string, ServiceRecord> = {
      "record-b": {
        id: "record-b",
        serviceItemId: "item-1",
        doneDate: "2026-06-01",
        doneBy: "田中",
        result: "pass",
      },
      "record-a": {
        id: "record-a",
        serviceItemId: "item-1",
        doneDate: "2026-06-01",
        doneBy: "鈴木",
        result: "pass",
      },
      "record-newest": {
        id: "record-newest",
        serviceItemId: "item-1",
        doneDate: "2026-07-01",
        doneBy: "佐藤",
        result: "pass",
      },
      "record-other-item": {
        id: "record-other-item",
        serviceItemId: "item-2",
        doneDate: "2026-07-15",
        doneBy: "高橋",
        result: "pass",
      },
    };

    expect(serviceRecordsOf({ serviceRecords }, "item-1")).toEqual([
      serviceRecords["record-newest"],
      serviceRecords["record-a"],
      serviceRecords["record-b"],
    ]);
  });

  it("該当する実施記録が無ければ空配列を返す", () => {
    expect(serviceRecordsOf({ serviceRecords: {} }, "item-1")).toEqual([]);
  });
});

describe("unreadNotificationCount", () => {
  it("isReadがfalseの通知の件数のみを数える", () => {
    const notifications: Record<string, Notification> = {
      "notification-1": {
        id: "notification-1",
        type: "dueSoon",
        targetType: "serviceItem",
        targetId: "item-1",
        personId: "person-1",
        message: "期限が近づいています",
        createdDate: "2026-06-01",
        isRead: false,
      },
      "notification-2": {
        id: "notification-2",
        type: "overdue",
        targetType: "serviceItem",
        targetId: "item-2",
        personId: "person-1",
        message: "期限が過ぎています",
        createdDate: "2026-06-02",
        isRead: true,
      },
      "notification-3": {
        id: "notification-3",
        type: "orderRecommended",
        targetType: "serviceItem",
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
 * 固定データは @/test/serviceItemRowFixtures に集約(項目一覧フィルタのテストと共有)。
 */
describe("serviceItemRowsOf: 対象の絞り込み・並び順", () => {
  it("非稼働機器(休止/廃棄)の項目・isActive=false 項目・dangling機器の項目を除外する", () => {
    const state = makeState([
      makeServiceItem({ id: "keep" }),
      makeServiceItem({ id: "on-suspended", equipmentId: eqSuspended.id }),
      makeServiceItem({ id: "on-retired", equipmentId: eqRetired.id }),
      makeServiceItem({ id: "inactive", isActive: false }),
      makeServiceItem({ id: "dangling-eq", equipmentId: "eq-missing" }),
    ]);
    expect(ids(serviceItemRowsOf(state, TODAY))).toEqual(["keep"]);
  });

  it("nextDueDate 昇順、同値は serviceItem.id 昇順", () => {
    const state = makeState([
      makeServiceItem({ id: "b", nextDueDate: "2026-05-01" }),
      makeServiceItem({ id: "a", nextDueDate: "2026-05-01" }),
      makeServiceItem({ id: "c", nextDueDate: "2026-01-01" }),
    ]);
    expect(ids(serviceItemRowsOf(state, TODAY))).toEqual(["c", "a", "b"]);
  });
});

describe("serviceItemRowsOf: status 導出", () => {
  it("期限超過は overdue", () => {
    const state = makeState([makeServiceItem({ id: "od", nextDueDate: "2026-01-01" })]);
    const [row] = serviceItemRowsOf(state, TODAY);
    expect(row.status).toBe(SERVICE_ITEM_STATUS.OVERDUE);
  });

  it("外部・leadTimeDays 未設定で vendor.standardLeadTimeDays フォールバック経由の orderNow", () => {
    // 推奨日 = 2026-08-01 − 20(vendor) − 14 = 2026-06-28 ≤ TODAY(2026-07-03) かつ有効案件なし
    const state = makeState([
      makeServiceItem({
        id: "on",
        execution: EXECUTION.EXTERNAL,
        vendorId: calibrator.id,
        leadTimeDays: undefined,
        bufferDays: 14,
        nextDueDate: "2026-08-01",
      }),
    ]);
    const [row] = serviceItemRowsOf(state, TODAY);
    expect(row.status).toBe(SERVICE_ITEM_STATUS.ORDER_NOW);
    expect(row.recommendedOrderDate).toBe("2026-06-28");
  });

  it("内部実施は recommendedOrderDate が null(発注の概念がない)", () => {
    const state = makeState([makeServiceItem({ id: "int", execution: EXECUTION.INTERNAL })]);
    const [row] = serviceItemRowsOf(state, TODAY);
    expect(row.recommendedOrderDate).toBeNull();
  });

  it("外部でも参照先 Vendor が存在しない(dangling)なら納期解決不可で recommendedOrderDate は null", () => {
    // vendorId は設定されているが vendors に該当なし → vendor=null。leadTimeDays 未設定のため解決不可
    const state = makeState([
      makeServiceItem({
        id: "dangling-vendor",
        execution: EXECUTION.EXTERNAL,
        vendorId: "v-missing",
        leadTimeDays: undefined,
        nextDueDate: "2027-01-01",
      }),
    ]);
    const [row] = serviceItemRowsOf(state, TODAY);
    expect(row.serviceItem.id).toBe("dangling-vendor");
    expect(row.recommendedOrderDate).toBeNull();
  });
});

describe("serviceItemRowsOf: canCreateServiceOrder", () => {
  const externalServiceItem = makeServiceItem({
    id: "ext",
    execution: EXECUTION.EXTERNAL,
    vendorId: calibrator.id,
    leadTimeDays: 20,
    nextDueDate: "2027-01-01",
  });

  it("外部かつ有効案件なしなら true", () => {
    const [row] = serviceItemRowsOf(makeState([externalServiceItem]), TODAY);
    expect(row.canCreateServiceOrder).toBe(true);
  });

  it("外部でも有効案件があれば false", () => {
    const serviceOrder: ServiceOrder = {
      id: "o-1",
      serviceItemId: externalServiceItem.id,
      vendorId: calibrator.id,
      status: SERVICE_ORDER_STATUS.ORDERED,
    };
    const [row] = serviceItemRowsOf(makeState([externalServiceItem], [serviceOrder]), TODAY);
    expect(row.canCreateServiceOrder).toBe(false);
  });

  it("内部項目は常に false", () => {
    const [row] = serviceItemRowsOf(makeState([makeServiceItem({ id: "int" })]), TODAY);
    expect(row.canCreateServiceOrder).toBe(false);
  });
});

describe("serviceItemRowsOf: personLabel(D-001)", () => {
  it("dangling(参照先なし)は「—」、無効担当者は「(無効)」注記", () => {
    const state = makeState([
      makeServiceItem({ id: "dangling-person", personId: "p-missing" }),
      makeServiceItem({ id: "inactive-person", personId: inactivePerson.id }),
    ]);
    const byId = Object.fromEntries(
      serviceItemRowsOf(state, TODAY).map((row) => [row.serviceItem.id, row]),
    );
    expect(byId["dangling-person"]?.personLabel).toBe("—");
    expect(byId["inactive-person"]?.personLabel).toBe("鈴木(無効)");
  });
});
