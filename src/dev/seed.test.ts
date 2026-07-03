/**
 * 開発用シードデータの検証（seed.ts）。
 * スキーマ整合・参照整合・全ステータス網羅・D-006（1項目1有効案件）を確認する。
 */

import { buildSeedState, seedIfEmpty } from "@/dev/seed";
import { deriveItemStatus, type ItemStatus } from "@/domain/itemStatus";
import { isActiveOrderStatus } from "@/domain/orderStatus";
import { appStateSchema } from "@/store/schema";
import { CYCLE, EQUIPMENT_STATUS, EXECUTION, ITEM_TYPE } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { setupStoreIsolation, seedStore } from "@/test/renderWithStore";
import { beforeEach, describe, expect, it } from "vitest";

const TODAY = "2026-07-03";

beforeEach(setupStoreIsolation);

describe("buildSeedState", () => {
  it("appStateSchemaの検証を通過する", () => {
    const state = buildSeedState(TODAY);
    expect(appStateSchema.safeParse(state).success).toBe(true);
  });

  it("全itemsのequipmentIdがequipmentに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const item of Object.values(state.items)) {
      expect(state.equipment[item.equipmentId]).toBeDefined();
    }
  });

  it("全itemsのpersonIdがpersonsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const item of Object.values(state.items)) {
      expect(state.persons[item.personId]).toBeDefined();
    }
  });

  it("execution=externalな全itemsのvendorIdがvendorsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const item of Object.values(state.items)) {
      if (item.execution !== EXECUTION.EXTERNAL) continue;
      expect(item.vendorId).toBeDefined();
      expect(state.vendors[item.vendorId ?? ""]).toBeDefined();
    }
  });

  it("全recordsのitemIdがitemsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const record of Object.values(state.records)) {
      expect(state.items[record.itemId]).toBeDefined();
    }
  });

  it("orderId指定があるrecordsのそのorderIdがordersに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const record of Object.values(state.records)) {
      if (record.orderId === undefined) continue;
      expect(state.orders[record.orderId]).toBeDefined();
    }
  });

  it("全ordersのitemId/vendorIdがitems/vendorsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const order of Object.values(state.orders)) {
      expect(state.items[order.itemId]).toBeDefined();
      expect(state.vendors[order.vendorId]).toBeDefined();
    }
  });

  it("有効な機器かつ有効な項目のステータスがoverdue/orderNow/inProgress/dueSoon/okの5種を全て含む", () => {
    const state = buildSeedState(TODAY);
    const orders = Object.values(state.orders);
    const statuses = new Set<ItemStatus>();

    for (const item of Object.values(state.items)) {
      const equipment = state.equipment[item.equipmentId];
      if (equipment?.status !== EQUIPMENT_STATUS.ACTIVE) continue;
      if (!item.isActive) continue;
      const vendor = item.vendorId === undefined ? null : (state.vendors[item.vendorId] ?? null);
      statuses.add(deriveItemStatus(item, orders, vendor, TODAY));
    }

    expect(statuses).toEqual(
      new Set<ItemStatus>(["overdue", "orderNow", "inProgress", "dueSoon", "ok"]),
    );
  });

  it("同一itemIdに有効案件(isActiveOrderStatus)が2件以上存在しない", () => {
    const state = buildSeedState(TODAY);
    const activeOrderCountByItemId = new Map<string, number>();
    for (const order of Object.values(state.orders)) {
      if (!isActiveOrderStatus(order.status)) continue;
      activeOrderCountByItemId.set(
        order.itemId,
        (activeOrderCountByItemId.get(order.itemId) ?? 0) + 1,
      );
    }
    for (const count of activeOrderCountByItemId.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it("equipment全件のmanagementNoがユニークである", () => {
    const state = buildSeedState(TODAY);
    const managementNumbers = Object.values(state.equipment).map(
      (equipment) => equipment.managementNo,
    );
    expect(new Set(managementNumbers).size).toBe(managementNumbers.length);
  });
});

describe("seedIfEmpty", () => {
  it("空ストアの場合はtrueを返しitemsが非空になる", () => {
    expect(seedIfEmpty()).toBe(true);
    expect(Object.keys(useAppStore.getState().items).length).toBeGreaterThan(0);
  });

  it("既存データがある場合はfalseを返し既存の内容を上書きしない", () => {
    seedStore({
      items: {
        "existing-item": {
          id: "existing-item",
          equipmentId: "existing-equipment",
          type: ITEM_TYPE.INSPECTION,
          name: "既存項目",
          cycle: CYCLE.Y1,
          execution: EXECUTION.INTERNAL,
          bufferDays: 14,
          personId: "existing-person",
          noticeDaysBefore: 30,
          nextDueDate: "2026-08-01",
          isActive: true,
        },
      },
    });

    expect(seedIfEmpty()).toBe(false);

    const { items } = useAppStore.getState();
    expect(Object.keys(items)).toEqual(["existing-item"]);
  });
});
