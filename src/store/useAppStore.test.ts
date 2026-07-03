/**
 * カスケードアクションの検証（store.md「アクション仕様」、decisions.md D-005 / D-006）。
 * 単純CRUDのスライス単体検証は slices/*.test.ts、読込パイプラインは merge.test.ts が担う。
 */

import type { CalibrationOrder, Equipment, InspectionItem, Person, Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { beforeEach, describe, expect, it } from "vitest";

const vendor: Vendor = { id: "vendor-1", name: "校正社", isManufacturer: true, isCalibrator: true };
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
const item: InspectionItem = {
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
  lastDoneDate: "2025-07-15",
  nextDueDate: "2026-07-15",
  isActive: true,
};
const returnedOrder: CalibrationOrder = {
  id: "order-1",
  itemId: "item-1",
  vendorId: "vendor-1",
  status: "returned",
};

const seedBase = (overrides?: { items?: Record<string, InspectionItem> }): void => {
  seedStore({
    vendors: { [vendor.id]: vendor },
    persons: { [person.id]: person },
    equipment: { [equipment.id]: equipment },
    items: overrides?.items ?? { [item.id]: item },
  });
};

beforeEach(setupStoreIsolation);

describe("replaceEntities: CSVインポートの全置換(D-029)", () => {
  it("対象エンティティのみ検証済みデータで置き換え、他エンティティは保持する", () => {
    seedBase();
    const imported: Record<string, Vendor> = {
      "vendor-9": { id: "vendor-9", name: "新校正社", isManufacturer: false, isCalibrator: true },
    };
    useAppStore.getState().replaceEntities("vendors", imported);
    expect(useAppStore.getState().vendors).toEqual(imported);
    expect(useAppStore.getState().equipment).toEqual({ [equipment.id]: equipment });
    expect(useAppStore.getState().items).toEqual({ [item.id]: item });
  });

  it("空の Record を渡すと対象エンティティを全消去する", () => {
    seedBase();
    useAppStore.getState().replaceEntities("items", {});
    expect(useAppStore.getState().items).toEqual({});
    expect(useAppStore.getState().equipment).toEqual({ [equipment.id]: equipment });
  });
});

describe("addRecord: 期限更新カスケード", () => {
  it.each(["pass", "adjusted"] as const)(
    "result=%s で記録を追加し lastDoneDate / nextDueDate を更新する",
    (result) => {
      seedBase();
      const id = useAppStore
        .getState()
        .addRecord({ itemId: item.id, doneDate: "2026-07-10", doneBy: "田中", result });

      expect(id).not.toBeNull();
      const state = useAppStore.getState();
      expect(state.records[id as string]).toMatchObject({
        itemId: item.id,
        doneDate: "2026-07-10",
        result,
      });
      const updated = state.items[item.id] as InspectionItem;
      expect(updated.lastDoneDate).toBe("2026-07-10");
      expect(updated.nextDueDate).toBe("2027-07-10"); // 1Y 周期の暦月加算
    },
  );

  it("result=fail は lastDoneDate を更新し期限のみ据え置く（07-record-modal.md 副作用2・4、D-015）", () => {
    seedBase();
    const id = useAppStore
      .getState()
      .addRecord({ itemId: item.id, doneDate: "2026-07-10", doneBy: "田中", result: "fail" });

    expect(id).not.toBeNull();
    const updated = useAppStore.getState().items[item.id] as InspectionItem;
    expect(updated.lastDoneDate).toBe("2026-07-10");
    expect(updated.nextDueDate).toBe("2026-07-15");
  });

  it("存在しない項目には no-op（null）", () => {
    seedBase();
    const id = useAppStore
      .getState()
      .addRecord({ itemId: "item-gone", doneDate: "2026-07-10", doneBy: "田中", result: "pass" });
    expect(id).toBeNull();
    expect(useAppStore.getState().records).toEqual({});
  });

  it("不正な doneDate は全体 no-op（D-005: 記録だけ追加されない）", () => {
    seedBase();
    const id = useAppStore
      .getState()
      .addRecord({ itemId: item.id, doneDate: "2026-02-30", doneBy: "田中", result: "pass" });
    expect(id).toBeNull();
    expect(useAppStore.getState().records).toEqual({});
    expect((useAppStore.getState().items[item.id] as InspectionItem).nextDueDate).toBe(
      "2026-07-15",
    );
  });
});

describe("addRecord: 案件完了カスケード", () => {
  it("returned の案件を orderId 指定で completed に遷移させる", () => {
    seedBase();
    seedStore({ orders: { [returnedOrder.id]: returnedOrder } });

    const id = useAppStore.getState().addRecord({
      itemId: item.id,
      doneDate: "2026-07-10",
      doneBy: "校正社",
      result: "pass",
      orderId: returnedOrder.id,
    });

    expect(id).not.toBeNull();
    const state = useAppStore.getState();
    expect((state.orders[returnedOrder.id] as CalibrationOrder).status).toBe("completed");
    expect(state.records[id as string]?.orderId).toBe(returnedOrder.id);
  });

  it.each(["planned", "ordered", "inCalibration", "completed", "cancelled"] as const)(
    "%s の案件を orderId 指定すると全体 no-op（D-005: completed へ遷移不可）",
    (status) => {
      seedBase();
      seedStore({ orders: { [returnedOrder.id]: { ...returnedOrder, status } } });

      const id = useAppStore.getState().addRecord({
        itemId: item.id,
        doneDate: "2026-07-10",
        doneBy: "校正社",
        result: "pass",
        orderId: returnedOrder.id,
      });

      expect(id).toBeNull();
      const state = useAppStore.getState();
      expect(state.records).toEqual({});
      expect((state.orders[returnedOrder.id] as CalibrationOrder).status).toBe(status);
      expect((state.items[item.id] as InspectionItem).nextDueDate).toBe("2026-07-15");
    },
  );

  it("存在しない案件を orderId 指定すると全体 no-op", () => {
    seedBase();
    const id = useAppStore.getState().addRecord({
      itemId: item.id,
      doneDate: "2026-07-10",
      doneBy: "校正社",
      result: "pass",
      orderId: "order-gone",
    });
    expect(id).toBeNull();
    expect(useAppStore.getState().records).toEqual({});
  });
});

describe("addOrder: 1項目1有効案件（D-006）", () => {
  it("案件を初期状態 planned で追加する", () => {
    seedBase();
    const id = useAppStore.getState().addOrder({ itemId: item.id, vendorId: vendor.id });
    expect(id).not.toBeNull();
    expect(useAppStore.getState().orders[id as string]).toMatchObject({
      itemId: item.id,
      status: "planned",
    });
  });

  it.each(["planned", "ordered", "inCalibration", "returned"] as const)(
    "有効な案件（%s）が既にある項目には no-op",
    (status) => {
      seedBase();
      seedStore({ orders: { [returnedOrder.id]: { ...returnedOrder, status } } });
      expect(useAppStore.getState().addOrder({ itemId: item.id, vendorId: vendor.id })).toBeNull();
      expect(Object.keys(useAppStore.getState().orders)).toEqual([returnedOrder.id]);
    },
  );

  it.each(["completed", "cancelled"] as const)(
    "終端状態（%s）の案件のみなら追加できる",
    (status) => {
      seedBase();
      seedStore({ orders: { [returnedOrder.id]: { ...returnedOrder, status } } });
      expect(
        useAppStore.getState().addOrder({ itemId: item.id, vendorId: vendor.id }),
      ).not.toBeNull();
    },
  );

  it("存在しない項目には no-op", () => {
    seedBase();
    expect(
      useAppStore.getState().addOrder({ itemId: "item-gone", vendorId: vendor.id }),
    ).toBeNull();
  });
});

describe("updateOrderStatus: 遷移テーブル検証", () => {
  const seedOrderWith = (status: CalibrationOrder["status"]): void => {
    seedBase();
    seedStore({ orders: { [returnedOrder.id]: { ...returnedOrder, status } } });
  };

  it.each([
    ["planned", "ordered"],
    ["ordered", "inCalibration"],
    ["inCalibration", "returned"],
    ["planned", "cancelled"],
    ["ordered", "cancelled"],
    ["inCalibration", "cancelled"],
    ["returned", "cancelled"],
  ] as const)("隣接遷移 %s → %s を許可する", (from, to) => {
    seedOrderWith(from);
    expect(useAppStore.getState().updateOrderStatus(returnedOrder.id, to)).toBe(true);
    expect((useAppStore.getState().orders[returnedOrder.id] as CalibrationOrder).status).toBe(to);
  });

  it.each([
    ["planned", "inCalibration"], // 飛び越し
    ["ordered", "planned"], // 逆行
    ["completed", "cancelled"], // 終端から
    ["cancelled", "planned"], // 終端から
  ] as const)("許可されない遷移 %s → %s は no-op（false）", (from, to) => {
    seedOrderWith(from);
    expect(useAppStore.getState().updateOrderStatus(returnedOrder.id, to)).toBe(false);
    expect((useAppStore.getState().orders[returnedOrder.id] as CalibrationOrder).status).toBe(from);
  });

  it("completed への直接遷移は returned からでも拒否する（addRecord 経由のみ）", () => {
    seedOrderWith("returned");
    expect(useAppStore.getState().updateOrderStatus(returnedOrder.id, "completed")).toBe(false);
    expect((useAppStore.getState().orders[returnedOrder.id] as CalibrationOrder).status).toBe(
      "returned",
    );
  });

  it("存在しない案件は false", () => {
    seedBase();
    expect(useAppStore.getState().updateOrderStatus("order-gone", "ordered")).toBe(false);
  });
});

describe("resetAll", () => {
  it("全エンティティを空に戻す", () => {
    seedBase();
    seedStore({ orders: { [returnedOrder.id]: returnedOrder } });
    useAppStore.getState().resetAll();

    const state = useAppStore.getState();
    expect(state.vendors).toEqual({});
    expect(state.persons).toEqual({});
    expect(state.equipment).toEqual({});
    expect(state.items).toEqual({});
    expect(state.records).toEqual({});
    expect(state.orders).toEqual({});
    expect(state.notifications).toEqual({});
  });
});
