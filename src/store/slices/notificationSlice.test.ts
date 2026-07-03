/**
 * notificationSlice の検証（store.md「アクション仕様」generateNotifications）。
 * 発生条件そのものの網羅は domain/notificationRules.test.ts が担い、ここでは
 * ストア側の責務（対象絞り込み・重複抑止・id/日付付与・既読操作）を検証する。
 */

import type { CalibrationOrder, Equipment, InspectionItem, Person } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { beforeEach, describe, expect, it } from "vitest";

const person: Person = {
  id: "person-1",
  name: "田中",
  email: "tanaka@example.com",
  isActive: true,
};
const equipment: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  status: "active",
};
const inspectionItem: InspectionItem = {
  id: "item-1",
  equipmentId: "equipment-1",
  type: "calibration",
  name: "年次校正",
  cycle: "1Y",
  execution: "external",
  vendorId: "vendor-1",
  leadTimeDays: 30,
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate: "2026-07-15",
  isActive: true,
};
const order: CalibrationOrder = {
  id: "order-1",
  inspectionItemId: "item-1",
  vendorId: "vendor-1",
  status: "ordered",
};

const seedBase = (overrides?: { inspectionItems?: Record<string, InspectionItem> }): void => {
  seedStore({
    persons: { [person.id]: person },
    equipment: { [equipment.id]: equipment },
    inspectionItems: overrides?.inspectionItems ?? { [inspectionItem.id]: inspectionItem },
  });
};

beforeEach(setupStoreIsolation);

describe("generateNotifications", () => {
  it("期限超過の項目に overdue 通知を生成する（宛先は inspectionItem.personId）", () => {
    seedBase();
    useAppStore.getState().generateNotifications("2026-08-01");

    const notifications = Object.values(useAppStore.getState().notifications);
    expect(notifications).toHaveLength(2); // overdue + 発注推奨（有効案件なしの外部項目）
    const overdue = notifications.find((entry) => entry.type === "overdue");
    expect(overdue).toMatchObject({
      targetType: "inspectionItem",
      targetId: inspectionItem.id,
      personId: person.id,
      createdDate: "2026-08-01",
      isRead: false,
    });
  });

  it("同一（targetType, targetId, type）の未読通知があれば重複生成しない", () => {
    seedBase();
    useAppStore.getState().generateNotifications("2026-08-01");
    const count = Object.keys(useAppStore.getState().notifications).length;

    useAppStore.getState().generateNotifications("2026-08-02");
    expect(Object.keys(useAppStore.getState().notifications)).toHaveLength(count);
  });

  it("既読になった通知は再生成を抑止しない（未読のみが抑止対象）", () => {
    seedBase();
    useAppStore.getState().generateNotifications("2026-08-01");
    const count = Object.keys(useAppStore.getState().notifications).length;
    useAppStore.getState().markAllAsRead();

    useAppStore.getState().generateNotifications("2026-08-02");
    expect(Object.keys(useAppStore.getState().notifications)).toHaveLength(count * 2);
  });

  it("無効な項目・稼働中でない機器の項目は対象外", () => {
    seedBase({
      inspectionItems: {
        "item-inactive": { ...inspectionItem, id: "item-inactive", isActive: false },
        "item-suspended": {
          ...inspectionItem,
          id: "item-suspended",
          equipmentId: "equipment-suspended",
        },
      },
    });
    seedStore({
      equipment: {
        [equipment.id]: equipment,
        "equipment-suspended": { ...equipment, id: "equipment-suspended", status: "suspended" },
      },
    });

    useAppStore.getState().generateNotifications("2026-08-01");
    expect(useAppStore.getState().notifications).toEqual({});
  });

  it("返却予定超過の案件に deliveryOverdue 通知を inspectionItem.personId 宛で生成する", () => {
    seedBase({
      inspectionItems: { [inspectionItem.id]: { ...inspectionItem, nextDueDate: "2099-01-01" } },
    });
    seedStore({ orders: { [order.id]: { ...order, dueDate: "2026-07-01" } } });

    useAppStore.getState().generateNotifications("2026-08-01");
    const notifications = Object.values(useAppStore.getState().notifications);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "deliveryOverdue",
      targetType: "order",
      targetId: order.id,
      personId: person.id,
    });
  });
});

describe("markAsRead / markAllAsRead", () => {
  it("markAsRead は対象が無ければ no-op", () => {
    seedBase();
    useAppStore.getState().markAsRead("notification-gone");
    expect(useAppStore.getState().notifications).toEqual({});
  });

  it("markAsRead は対象の通知のみ既読化する", () => {
    seedBase();
    useAppStore.getState().generateNotifications("2026-08-01");
    const [first, second] = Object.values(useAppStore.getState().notifications);
    useAppStore.getState().markAsRead((first as { id: string }).id);

    const state = useAppStore.getState();
    expect(state.notifications[(first as { id: string }).id]?.isRead).toBe(true);
    expect(state.notifications[(second as { id: string }).id]?.isRead).toBe(false);
  });
});
