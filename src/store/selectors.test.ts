import { itemsOf, ordersOf, recordsOf, unreadNotificationCount } from "@/store/selectors";
import type {
  CalibrationOrder,
  InspectionItem,
  InspectionRecord,
  Notification,
} from "@/store/types";
import { describe, expect, it } from "vitest";

describe("itemsOf", () => {
  it("指定equipmentIdに属する項目のみを抽出する", () => {
    const items: Record<string, InspectionItem> = {
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

    expect(itemsOf({ items }, "equipment-1")).toEqual([items["item-1"]]);
  });

  it("該当する項目が無ければ空配列を返す", () => {
    expect(itemsOf({ items: {} }, "equipment-1")).toEqual([]);
  });
});

describe("ordersOf", () => {
  it("指定itemIdに属する案件のみを抽出する", () => {
    const orders: Record<string, CalibrationOrder> = {
      "order-1": {
        id: "order-1",
        itemId: "item-1",
        vendorId: "vendor-1",
        status: "planned",
      },
      "order-2": {
        id: "order-2",
        itemId: "item-2",
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
        itemId: "item-1",
        doneDate: "2026-06-01",
        doneBy: "田中",
        result: "pass",
      },
      "record-a": {
        id: "record-a",
        itemId: "item-1",
        doneDate: "2026-06-01",
        doneBy: "鈴木",
        result: "pass",
      },
      "record-newest": {
        id: "record-newest",
        itemId: "item-1",
        doneDate: "2026-07-01",
        doneBy: "佐藤",
        result: "pass",
      },
      "record-other-item": {
        id: "record-other-item",
        itemId: "item-2",
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
        targetType: "item",
        targetId: "item-1",
        personId: "person-1",
        message: "期限が近づいています",
        createdDate: "2026-06-01",
        isRead: false,
      },
      "notification-2": {
        id: "notification-2",
        type: "overdue",
        targetType: "item",
        targetId: "item-2",
        personId: "person-1",
        message: "期限が過ぎています",
        createdDate: "2026-06-02",
        isRead: true,
      },
      "notification-3": {
        id: "notification-3",
        type: "orderRecommended",
        targetType: "item",
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
