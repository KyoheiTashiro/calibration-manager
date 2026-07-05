/**
 * カスケードアクションの検証（store.md「アクション仕様」、D-005 / D-006）。
 * 単純CRUDのスライス単体検証は slices/*.test.ts、読込パイプラインは merge.test.ts が担う。
 */

import type { ServiceOrder, Equipment, ServiceItem, Person, Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { beforeEach, describe, expect, it } from "vitest";

beforeEach(setupStoreIsolation);

// 共有フィクスチャ（vendor→person→equipment→serviceItem の参照連鎖を持つ最小構成）
const vendor: Vendor = {
  id: "vendor-1",
  name: "校正社",
  isManufacturer: true,
  isCalibrator: true,
};
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
const serviceItem: ServiceItem = {
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
const returnedServiceOrder: ServiceOrder = {
  id: "serviceOrder-1",
  serviceItemId: "item-1",
  vendorId: "vendor-1",
  status: "returned",
};

/** 上記フィクスチャ一式を store へ投入する（serviceItems のみ差し替え可） */
const seedBase = (overrides?: { serviceItems?: Record<string, ServiceItem> }): void => {
  seedStore({
    vendors: { [vendor.id]: vendor },
    persons: { [person.id]: person },
    equipment: { [equipment.id]: equipment },
    serviceItems: overrides?.serviceItems ?? { [serviceItem.id]: serviceItem },
  });
};

/** 遷移テーブル検証用: 任意ステータスの案件を1件投入する */
const seedServiceOrderWith = (status: ServiceOrder["status"]): void => {
  seedBase();
  seedStore({ serviceOrders: { [returnedServiceOrder.id]: { ...returnedServiceOrder, status } } });
};

describe("replaceEntities: CSVインポートの全置換(D-029)", () => {
  it("対象エンティティのみ検証済みデータで置き換え、他エンティティは保持する", () => {
    seedBase();
    const imported: Record<string, Vendor> = {
      "vendor-9": { id: "vendor-9", name: "新校正社", isManufacturer: false, isCalibrator: true },
    };
    useAppStore.getState().replaceEntities("vendors", imported);
    expect(useAppStore.getState().vendors).toEqual(imported);
    expect(useAppStore.getState().equipment).toEqual({ [equipment.id]: equipment });
    expect(useAppStore.getState().serviceItems).toEqual({ [serviceItem.id]: serviceItem });
  });

  it("空の Record を渡すと対象エンティティを全消去する", () => {
    seedBase();
    useAppStore.getState().replaceEntities("serviceItems", {});
    expect(useAppStore.getState().serviceItems).toEqual({});
    expect(useAppStore.getState().equipment).toEqual({ [equipment.id]: equipment });
  });
});

describe("addServiceRecord: 期限更新カスケード", () => {
  it.each(["pass", "adjusted"] as const)(
    "result=%s で記録を追加し lastDoneDate / nextDueDate を更新する",
    (result) => {
      seedBase();
      const id = useAppStore.getState().addServiceRecord({
        serviceItemId: serviceItem.id,
        doneDate: "2026-07-10",
        doneBy: "田中",
        result,
      });

      expect(id).not.toBeNull();
      if (id === null) throw new Error("id should not be null");
      const state = useAppStore.getState();
      expect(state.serviceRecords[id]).toMatchObject({
        serviceItemId: serviceItem.id,
        doneDate: "2026-07-10",
        result,
      });
      const updated = state.serviceItems[serviceItem.id];
      expect(updated.lastDoneDate).toBe("2026-07-10");
      expect(updated.nextDueDate).toBe("2027-07-10"); // 1Y 周期の暦月加算
    },
  );

  it("result=fail は lastDoneDate を更新し期限のみ据え置く（07-service-record-modal.md 副作用2・4、D-015）", () => {
    seedBase();
    const id = useAppStore.getState().addServiceRecord({
      serviceItemId: serviceItem.id,
      doneDate: "2026-07-10",
      doneBy: "田中",
      result: "fail",
    });

    expect(id).not.toBeNull();
    const updated = useAppStore.getState().serviceItems[serviceItem.id];
    expect(updated.lastDoneDate).toBe("2026-07-10");
    expect(updated.nextDueDate).toBe("2026-07-15");
  });

  it("存在しない項目には no-op（null）", () => {
    seedBase();
    const id = useAppStore.getState().addServiceRecord({
      serviceItemId: "item-gone",
      doneDate: "2026-07-10",
      doneBy: "田中",
      result: "pass",
    });
    expect(id).toBeNull();
    expect(useAppStore.getState().serviceRecords).toEqual({});
  });

  it("不正な doneDate は全体 no-op（D-005: 記録だけ追加されない）", () => {
    seedBase();
    const id = useAppStore.getState().addServiceRecord({
      serviceItemId: serviceItem.id,
      doneDate: "2026-02-30",
      doneBy: "田中",
      result: "pass",
    });
    expect(id).toBeNull();
    expect(useAppStore.getState().serviceRecords).toEqual({});
    expect(useAppStore.getState().serviceItems[serviceItem.id].nextDueDate).toBe("2026-07-15");
  });
});

describe("addServiceRecord: 案件完了カスケード", () => {
  it("returned の案件を serviceOrderId 指定で completed に遷移させる", () => {
    seedBase();
    seedStore({ serviceOrders: { [returnedServiceOrder.id]: returnedServiceOrder } });

    const id = useAppStore.getState().addServiceRecord({
      serviceItemId: serviceItem.id,
      doneDate: "2026-07-10",
      doneBy: "校正社",
      result: "pass",
      serviceOrderId: returnedServiceOrder.id,
    });

    expect(id).not.toBeNull();
    if (id === null) throw new Error("id should not be null");
    const state = useAppStore.getState();
    expect(state.serviceOrders[returnedServiceOrder.id].status).toBe("completed");
    expect(state.serviceRecords[id].serviceOrderId).toBe(returnedServiceOrder.id);
  });

  it.each(["planned", "ordered", "inCalibration", "completed", "cancelled"] as const)(
    "%s の案件を serviceOrderId 指定すると全体 no-op（D-005: completed へ遷移不可）",
    (status) => {
      seedBase();
      seedStore({
        serviceOrders: { [returnedServiceOrder.id]: { ...returnedServiceOrder, status } },
      });

      const id = useAppStore.getState().addServiceRecord({
        serviceItemId: serviceItem.id,
        doneDate: "2026-07-10",
        doneBy: "校正社",
        result: "pass",
        serviceOrderId: returnedServiceOrder.id,
      });

      expect(id).toBeNull();
      const state = useAppStore.getState();
      expect(state.serviceRecords).toEqual({});
      expect(state.serviceOrders[returnedServiceOrder.id].status).toBe(status);
      expect(state.serviceItems[serviceItem.id].nextDueDate).toBe("2026-07-15");
    },
  );

  it("存在しない案件を serviceOrderId 指定すると全体 no-op", () => {
    seedBase();
    const id = useAppStore.getState().addServiceRecord({
      serviceItemId: serviceItem.id,
      doneDate: "2026-07-10",
      doneBy: "校正社",
      result: "pass",
      serviceOrderId: "serviceOrder-gone",
    });
    expect(id).toBeNull();
    expect(useAppStore.getState().serviceRecords).toEqual({});
  });
});

describe("addServiceOrder: 1項目1有効案件（D-006）", () => {
  it("案件を初期状態 planned で追加する", () => {
    seedBase();
    const id = useAppStore
      .getState()
      .addServiceOrder({ serviceItemId: serviceItem.id, vendorId: vendor.id });
    expect(id).not.toBeNull();
    if (id === null) throw new Error("id should not be null");
    expect(useAppStore.getState().serviceOrders[id]).toMatchObject({
      serviceItemId: serviceItem.id,
      status: "planned",
    });
  });

  it.each(["planned", "ordered", "inCalibration", "returned"] as const)(
    "有効な案件（%s）が既にある項目には no-op",
    (status) => {
      seedBase();
      seedStore({
        serviceOrders: { [returnedServiceOrder.id]: { ...returnedServiceOrder, status } },
      });
      expect(
        useAppStore
          .getState()
          .addServiceOrder({ serviceItemId: serviceItem.id, vendorId: vendor.id }),
      ).toBeNull();
      expect(Object.keys(useAppStore.getState().serviceOrders)).toEqual([returnedServiceOrder.id]);
    },
  );

  it.each(["completed", "cancelled"] as const)(
    "終端状態（%s）の案件のみなら追加できる",
    (status) => {
      seedBase();
      seedStore({
        serviceOrders: { [returnedServiceOrder.id]: { ...returnedServiceOrder, status } },
      });
      expect(
        useAppStore
          .getState()
          .addServiceOrder({ serviceItemId: serviceItem.id, vendorId: vendor.id }),
      ).not.toBeNull();
    },
  );

  it("存在しない項目には no-op", () => {
    seedBase();
    expect(
      useAppStore.getState().addServiceOrder({ serviceItemId: "item-gone", vendorId: vendor.id }),
    ).toBeNull();
  });
});

describe("updateServiceOrderStatus: 遷移テーブル検証", () => {
  it.each([
    ["planned", "ordered"],
    ["ordered", "inCalibration"],
    ["inCalibration", "returned"],
    ["planned", "cancelled"],
    ["ordered", "cancelled"],
    ["inCalibration", "cancelled"],
    ["returned", "cancelled"],
  ] as const)("隣接遷移 %s → %s を許可する", (from, to) => {
    seedServiceOrderWith(from);
    expect(useAppStore.getState().updateServiceOrderStatus(returnedServiceOrder.id, to)).toBe(true);
    expect(useAppStore.getState().serviceOrders[returnedServiceOrder.id].status).toBe(to);
  });

  it.each([
    ["planned", "inCalibration"], // 飛び越し
    ["ordered", "planned"], // 逆行
    ["completed", "cancelled"], // 終端から
    ["cancelled", "planned"], // 終端から
  ] as const)("許可されない遷移 %s → %s は no-op（false）", (from, to) => {
    seedServiceOrderWith(from);
    expect(useAppStore.getState().updateServiceOrderStatus(returnedServiceOrder.id, to)).toBe(
      false,
    );
    expect(useAppStore.getState().serviceOrders[returnedServiceOrder.id].status).toBe(from);
  });

  it("completed への直接遷移は returned からでも拒否する（addServiceRecord 経由のみ）", () => {
    seedServiceOrderWith("returned");
    expect(
      useAppStore.getState().updateServiceOrderStatus(returnedServiceOrder.id, "completed"),
    ).toBe(false);
    expect(useAppStore.getState().serviceOrders[returnedServiceOrder.id].status).toBe("returned");
  });

  it("存在しない案件は false", () => {
    seedBase();
    expect(useAppStore.getState().updateServiceOrderStatus("serviceOrder-gone", "ordered")).toBe(
      false,
    );
  });
});

describe("resetAll", () => {
  it("全エンティティを空に戻す", () => {
    seedBase();
    seedStore({ serviceOrders: { [returnedServiceOrder.id]: returnedServiceOrder } });
    useAppStore.getState().resetAll();

    const state = useAppStore.getState();
    expect(state.vendors).toEqual({});
    expect(state.persons).toEqual({});
    expect(state.equipment).toEqual({});
    expect(state.serviceItems).toEqual({});
    expect(state.serviceRecords).toEqual({});
    expect(state.serviceOrders).toEqual({});
    expect(state.notifications).toEqual({});
  });
});
