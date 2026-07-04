/**
 * 開発用シードデータの検証（seed.ts）。
 * スキーマ整合・参照整合・全ステータス網羅・D-006（1項目1有効案件）を確認する。
 */

import { buildSeedState, seedIfEmpty } from "@/dev/seed";
import { deriveServiceItemStatus, type ServiceItemStatus } from "@/domain/serviceItemStatus";
import { isActiveServiceOrderStatus } from "@/domain/serviceOrderStatus";
import { appStateSchema } from "@/store/schema";
import { CYCLE, EQUIPMENT_STATUS, EXECUTION, SERVICE_ITEM_TYPE } from "@/store/types";
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

  it("全serviceItemsのequipmentIdがequipmentに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const serviceItem of Object.values(state.serviceItems)) {
      expect(state.equipment[serviceItem.equipmentId]).toBeDefined();
    }
  });

  it("全serviceItemsのpersonIdがpersonsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const serviceItem of Object.values(state.serviceItems)) {
      expect(state.persons[serviceItem.personId]).toBeDefined();
    }
  });

  it("execution=externalな全serviceItemsのvendorIdがvendorsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const serviceItem of Object.values(state.serviceItems)) {
      if (serviceItem.execution !== EXECUTION.EXTERNAL) continue;
      expect(serviceItem.vendorId).toBeDefined();
      expect(state.vendors[serviceItem.vendorId ?? ""]).toBeDefined();
    }
  });

  it("全recordsのserviceItemIdがserviceItemsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const record of Object.values(state.records)) {
      expect(state.serviceItems[record.serviceItemId]).toBeDefined();
    }
  });

  it("serviceOrderId指定があるrecordsのそのserviceOrderIdがserviceOrdersに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const record of Object.values(state.records)) {
      if (record.serviceOrderId === undefined) continue;
      expect(state.serviceOrders[record.serviceOrderId]).toBeDefined();
    }
  });

  it("全serviceOrdersのserviceItemId/vendorIdがserviceItems/vendorsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const serviceOrder of Object.values(state.serviceOrders)) {
      expect(state.serviceItems[serviceOrder.serviceItemId]).toBeDefined();
      expect(state.vendors[serviceOrder.vendorId]).toBeDefined();
    }
  });

  it("有効な機器かつ有効な項目のステータスがoverdue/orderNow/inProgress/dueSoon/okの5種を全て含む", () => {
    const state = buildSeedState(TODAY);
    const serviceOrders = Object.values(state.serviceOrders);
    const statuses = new Set<ServiceItemStatus>();

    for (const serviceItem of Object.values(state.serviceItems)) {
      const equipment = state.equipment[serviceItem.equipmentId];
      if (equipment.status !== EQUIPMENT_STATUS.ACTIVE) continue;
      if (!serviceItem.isActive) continue;
      const vendor =
        serviceItem.vendorId === undefined ? null : (state.vendors[serviceItem.vendorId] ?? null);
      statuses.add(deriveServiceItemStatus(serviceItem, serviceOrders, vendor, TODAY));
    }

    expect(statuses).toEqual(
      new Set<ServiceItemStatus>(["overdue", "orderNow", "inProgress", "dueSoon", "ok"]),
    );
  });

  it("有効な機器かつ有効な項目が 種別×実施区分 の4組合せを全て含む", () => {
    const state = buildSeedState(TODAY);
    const combos = new Set<string>();

    for (const serviceItem of Object.values(state.serviceItems)) {
      const equipment = state.equipment[serviceItem.equipmentId];
      if (equipment.status !== EQUIPMENT_STATUS.ACTIVE) continue;
      if (!serviceItem.isActive) continue;
      combos.add(`${serviceItem.type}/${serviceItem.execution}`);
    }

    expect(combos).toEqual(
      new Set(
        Object.values(SERVICE_ITEM_TYPE).flatMap((type) =>
          Object.values(EXECUTION).map((execution) => `${type}/${execution}`),
        ),
      ),
    );
  });

  it("同一serviceItemIdに有効案件(isActiveServiceOrderStatus)が2件以上存在しない", () => {
    const state = buildSeedState(TODAY);
    const activeServiceOrderCountByServiceItemId = new Map<string, number>();
    for (const serviceOrder of Object.values(state.serviceOrders)) {
      if (!isActiveServiceOrderStatus(serviceOrder.status)) continue;
      activeServiceOrderCountByServiceItemId.set(
        serviceOrder.serviceItemId,
        (activeServiceOrderCountByServiceItemId.get(serviceOrder.serviceItemId) ?? 0) + 1,
      );
    }
    for (const count of activeServiceOrderCountByServiceItemId.values()) {
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
  it("空ストアの場合はtrueを返しserviceItemsが非空になる", () => {
    expect(seedIfEmpty()).toBe(true);
    expect(Object.keys(useAppStore.getState().serviceItems).length).toBeGreaterThan(0);
  });

  it("既存データがある場合はfalseを返し既存の内容を上書きしない", () => {
    seedStore({
      serviceItems: {
        "existing-item": {
          id: "existing-item",
          equipmentId: "existing-equipment",
          type: SERVICE_ITEM_TYPE.INSPECTION,
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

    const { serviceItems } = useAppStore.getState();
    expect(Object.keys(serviceItems)).toEqual(["existing-item"]);
  });
});
