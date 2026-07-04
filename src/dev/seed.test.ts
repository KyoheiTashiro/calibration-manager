/**
 * 開発用シードデータの検証（seed.ts）。
 * スキーマ整合・参照整合・全ステータス網羅・D-006（1項目1有効案件）を確認する。
 */

import { buildSeedState, seedIfEmpty } from "@/dev/seed";
import {
  deriveInspectionItemStatus,
  type InspectionItemStatus,
} from "@/domain/inspectionItemStatus";
import { isActiveOrderStatus } from "@/domain/orderStatus";
import { appStateSchema } from "@/store/schema";
import { CYCLE, EQUIPMENT_STATUS, EXECUTION, INSPECTION_ITEM_TYPE } from "@/store/types";
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

  it("全inspectionItemsのequipmentIdがequipmentに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const inspectionItem of Object.values(state.inspectionItems)) {
      expect(state.equipment[inspectionItem.equipmentId]).toBeDefined();
    }
  });

  it("全inspectionItemsのpersonIdがpersonsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const inspectionItem of Object.values(state.inspectionItems)) {
      expect(state.persons[inspectionItem.personId]).toBeDefined();
    }
  });

  it("execution=externalな全inspectionItemsのvendorIdがvendorsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const inspectionItem of Object.values(state.inspectionItems)) {
      if (inspectionItem.execution !== EXECUTION.EXTERNAL) continue;
      expect(inspectionItem.vendorId).toBeDefined();
      expect(state.vendors[inspectionItem.vendorId ?? ""]).toBeDefined();
    }
  });

  it("全recordsのinspectionItemIdがinspectionItemsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const record of Object.values(state.records)) {
      expect(state.inspectionItems[record.inspectionItemId]).toBeDefined();
    }
  });

  it("orderId指定があるrecordsのそのorderIdがordersに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const record of Object.values(state.records)) {
      if (record.orderId === undefined) continue;
      expect(state.orders[record.orderId]).toBeDefined();
    }
  });

  it("全ordersのinspectionItemId/vendorIdがinspectionItems/vendorsに存在する", () => {
    const state = buildSeedState(TODAY);
    for (const order of Object.values(state.orders)) {
      expect(state.inspectionItems[order.inspectionItemId]).toBeDefined();
      expect(state.vendors[order.vendorId]).toBeDefined();
    }
  });

  it("有効な機器かつ有効な項目のステータスがoverdue/orderNow/inProgress/dueSoon/okの5種を全て含む", () => {
    const state = buildSeedState(TODAY);
    const orders = Object.values(state.orders);
    const statuses = new Set<InspectionItemStatus>();

    for (const inspectionItem of Object.values(state.inspectionItems)) {
      const equipment = state.equipment[inspectionItem.equipmentId];
      if (equipment.status !== EQUIPMENT_STATUS.ACTIVE) continue;
      if (!inspectionItem.isActive) continue;
      const vendor =
        inspectionItem.vendorId === undefined
          ? null
          : (state.vendors[inspectionItem.vendorId] ?? null);
      statuses.add(deriveInspectionItemStatus(inspectionItem, orders, vendor, TODAY));
    }

    expect(statuses).toEqual(
      new Set<InspectionItemStatus>(["overdue", "orderNow", "inProgress", "dueSoon", "ok"]),
    );
  });

  it("有効な機器かつ有効な項目が 種別×実施区分 の4組合せを全て含む", () => {
    const state = buildSeedState(TODAY);
    const combos = new Set<string>();

    for (const inspectionItem of Object.values(state.inspectionItems)) {
      const equipment = state.equipment[inspectionItem.equipmentId];
      if (equipment.status !== EQUIPMENT_STATUS.ACTIVE) continue;
      if (!inspectionItem.isActive) continue;
      combos.add(`${inspectionItem.type}/${inspectionItem.execution}`);
    }

    expect(combos).toEqual(
      new Set(
        Object.values(INSPECTION_ITEM_TYPE).flatMap((type) =>
          Object.values(EXECUTION).map((execution) => `${type}/${execution}`),
        ),
      ),
    );
  });

  it("同一inspectionItemIdに有効案件(isActiveOrderStatus)が2件以上存在しない", () => {
    const state = buildSeedState(TODAY);
    const activeOrderCountByInspectionItemId = new Map<string, number>();
    for (const order of Object.values(state.orders)) {
      if (!isActiveOrderStatus(order.status)) continue;
      activeOrderCountByInspectionItemId.set(
        order.inspectionItemId,
        (activeOrderCountByInspectionItemId.get(order.inspectionItemId) ?? 0) + 1,
      );
    }
    for (const count of activeOrderCountByInspectionItemId.values()) {
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
  it("空ストアの場合はtrueを返しinspectionItemsが非空になる", () => {
    expect(seedIfEmpty()).toBe(true);
    expect(Object.keys(useAppStore.getState().inspectionItems).length).toBeGreaterThan(0);
  });

  it("既存データがある場合はfalseを返し既存の内容を上書きしない", () => {
    seedStore({
      inspectionItems: {
        "existing-item": {
          id: "existing-item",
          equipmentId: "existing-equipment",
          type: INSPECTION_ITEM_TYPE.INSPECTION,
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

    const { inspectionItems } = useAppStore.getState();
    expect(Object.keys(inspectionItems)).toEqual(["existing-item"]);
  });
});
