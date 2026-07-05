/**
 * 読込パイプライン（migrate → merge 3段サルベージ → sanitize）の検証
 * （store.md「永続化」、D-003）。
 */

import { STORAGE_KEY, STORAGE_VERSION } from "@/constants/storage";
import {
  emptyAppState,
  migratePersistedState,
  migrateV1ToV2,
  migrateV2ToV3,
  migrateV3ToV4,
  migrateV4ToV5,
  salvagePersistedState,
  sanitizeAppState,
} from "@/store/persistence";
import type {
  AppState,
  ServiceOrder,
  Equipment,
  ServiceItem,
  Notification,
  Person,
  Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { setupStoreIsolation } from "@/test/renderWithStore";
import { isRecord } from "@/utils/record";
import { beforeEach, describe, expect, it } from "vitest";

const vendor: Vendor = {
  id: "vendor-1",
  name: "校正社",
  isManufacturer: false,
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
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate: "2026-07-31",
  isActive: true,
};
const serviceOrder: ServiceOrder = {
  id: "order-1",
  serviceItemId: "item-1",
  vendorId: "vendor-1",
  status: "ordered",
};
const serviceItemNotification: Notification = {
  id: "notification-1",
  type: "dueSoon",
  targetType: "serviceItem",
  targetId: "item-1",
  personId: "person-1",
  message: "EQ-001 年次校正の期限が近づいています",
  createdDate: "2026-07-01",
  isRead: false,
};

const validState = (): AppState => ({
  vendors: { [vendor.id]: vendor },
  persons: { [person.id]: person },
  equipment: { [equipment.id]: equipment },
  serviceItems: { [serviceItem.id]: serviceItem },
  serviceRecords: {},
  serviceOrders: { [serviceOrder.id]: serviceOrder },
  notifications: { [serviceItemNotification.id]: serviceItemNotification },
});

describe("migratePersistedState", () => {
  it("現行バージョンのデータはそのまま通す", () => {
    const state = validState();
    expect(migratePersistedState(state, STORAGE_VERSION)).toBe(state);
  });

  it("旧バージョンからは登録済みステップを順に適用する", () => {
    const applied: number[] = [];
    const result = migratePersistedState({ marker: 0 }, STORAGE_VERSION - 1, {
      [STORAGE_VERSION - 1]: (persisted) => {
        applied.push(STORAGE_VERSION - 1);
        return { ...(isRecord(persisted) ? persisted : {}), migrated: true };
      },
    });
    expect(applied).toEqual([STORAGE_VERSION - 1]);
    expect(result).toEqual({ marker: 0, migrated: true });
  });

  it("ステップ未登録のバージョンはそのまま通す（例外を投げない）", () => {
    const state = validState();
    expect(migratePersistedState(state, STORAGE_VERSION - 1, {})).toBe(state);
  });
});

/** v1 形式の永続化データ（items キー / itemId / targetType "item"） */
const v1State = (): Record<string, unknown> => ({
  vendors: { [vendor.id]: vendor },
  persons: { [person.id]: person },
  equipment: { [equipment.id]: equipment },
  items: { [serviceItem.id]: serviceItem },
  records: {
    "record-1": {
      id: "record-1",
      itemId: "item-1",
      doneDate: "2026-06-01",
      doneBy: "田中",
      result: "pass",
    },
  },
  orders: {
    "order-1": { id: "order-1", itemId: "item-1", vendorId: "vendor-1", status: "ordered" },
  },
  notifications: {
    [serviceItemNotification.id]: {
      ...serviceItemNotification,
      targetType: "item",
    },
  },
});

/** v2 形式の永続化データ（inspectionItems キー / inspectionItemId / targetType "inspectionItem"） */
const v2State = (): Record<string, unknown> => ({
  vendors: { [vendor.id]: vendor },
  persons: { [person.id]: person },
  equipment: { [equipment.id]: equipment },
  inspectionItems: { [serviceItem.id]: serviceItem },
  records: {
    "record-1": {
      id: "record-1",
      inspectionItemId: "item-1",
      doneDate: "2026-06-01",
      doneBy: "田中",
      result: "pass",
    },
  },
  orders: {
    "order-1": {
      id: "order-1",
      inspectionItemId: "item-1",
      vendorId: "vendor-1",
      status: "ordered",
    },
  },
  notifications: {
    [serviceItemNotification.id]: {
      ...serviceItemNotification,
      targetType: "inspectionItem",
    },
  },
});

describe("migrateV1ToV2: item→inspectionItem リネーム（D-036）", () => {
  it("v1 データを v2 当時の形式へ変換する（最終形式は後続ステップが担う）", () => {
    const migrated = migrateV1ToV2(v1State());
    if (!isRecord(migrated)) throw new Error("migrated should be a record");
    expect(migrated).toEqual(v2State());
  });

  it("targetType が order の通知は変換しない", () => {
    const orderNotification = {
      ...serviceItemNotification,
      id: "notification-2",
      targetType: "order",
      targetId: "order-1",
    };
    const migrated = migrateV1ToV2({
      ...v1State(),
      notifications: { "notification-2": orderNotification },
    });
    if (!isRecord(migrated) || !isRecord(migrated.notifications)) {
      throw new Error("migrated.notifications should be a record");
    }
    const migratedNotification = migrated.notifications["notification-2"];
    if (!isRecord(migratedNotification)) throw new Error("notification-2 should be a record");
    expect(migratedNotification.targetType).toBe("order");
  });

  it("非オブジェクトや欠損キーは例外を投げず通す（後段サルベージに委ねる）", () => {
    expect(migrateV1ToV2(null)).toBeNull();
    expect(migrateV1ToV2("broken")).toBe("broken");
    const migrated = migrateV1ToV2({ vendors: 42, records: "broken" });
    if (!isRecord(migrated)) throw new Error("migrated should be a record");
    expect(migrated.records).toBe("broken");
    expect(salvagePersistedState(migrated)).toEqual(emptyAppState());
  });
});

/** v3 形式の永続化データ（orders キー / orderId / targetType "order"） */
const v3State = (): Record<string, unknown> => ({
  vendors: { [vendor.id]: vendor },
  persons: { [person.id]: person },
  equipment: { [equipment.id]: equipment },
  serviceItems: { [serviceItem.id]: serviceItem },
  records: {
    "record-1": {
      id: "record-1",
      serviceItemId: "item-1",
      doneDate: "2026-06-01",
      doneBy: "田中",
      result: "pass",
      orderId: "order-1",
    },
  },
  orders: {
    "order-1": { id: "order-1", serviceItemId: "item-1", vendorId: "vendor-1", status: "ordered" },
  },
  notifications: {
    [serviceItemNotification.id]: serviceItemNotification,
  },
});

describe("migrateV2ToV3: inspectionItem→serviceItem リネーム（D-045）", () => {
  it("v2 データを v3 形式へ変換し、後続 v4/v5 ステップを経て全体パースが成功する", () => {
    const migratedToV3 = migrateV2ToV3(v2State());
    const migrated = migrateV4ToV5(migrateV3ToV4(migratedToV3));
    const salvaged = salvagePersistedState(migrated);
    expect(Object.keys(salvaged.serviceItems)).toEqual(["item-1"]);
    expect(salvaged.serviceRecords["record-1"]?.serviceItemId).toBe("item-1");
    expect(salvaged.serviceOrders["order-1"]?.serviceItemId).toBe("item-1");
    expect(salvaged.notifications["notification-1"]?.targetType).toBe("serviceItem");
  });

  it("targetType が order の通知は変換しない", () => {
    const orderNotification = {
      ...serviceItemNotification,
      id: "notification-2",
      targetType: "order",
      targetId: "order-1",
    };
    const migrated = migrateV2ToV3({
      ...v2State(),
      notifications: { "notification-2": orderNotification },
    });
    if (!isRecord(migrated) || !isRecord(migrated.notifications)) {
      throw new Error("migrated.notifications should be a record");
    }
    const migratedNotification = migrated.notifications["notification-2"];
    if (!isRecord(migratedNotification)) throw new Error("notification-2 should be a record");
    expect(migratedNotification.targetType).toBe("order");
  });

  it("非オブジェクトや欠損キーは例外を投げず通す（後段サルベージに委ねる）", () => {
    expect(migrateV2ToV3(null)).toBeNull();
    expect(migrateV2ToV3("broken")).toBe("broken");
    const migrated = migrateV2ToV3({ vendors: 42, records: "broken" });
    if (!isRecord(migrated)) throw new Error("migrated should be a record");
    expect(migrated.records).toBe("broken");
    expect(salvagePersistedState(migrated)).toEqual(emptyAppState());
  });
});

describe("migrateV3ToV4: order→serviceOrder リネーム（D-046）", () => {
  it("v3 データを v4 形式へ変換し、後続 v5 ステップを経て全体パースが成功する", () => {
    const migrated = migrateV4ToV5(migrateV3ToV4(v3State()));
    const salvaged = salvagePersistedState(migrated);
    expect(Object.keys(salvaged.serviceOrders)).toEqual(["order-1"]);
    expect(salvaged.serviceOrders["order-1"]?.serviceItemId).toBe("item-1");
    expect(salvaged.serviceRecords["record-1"]?.serviceOrderId).toBe("order-1");
    if (!isRecord(migrated)) throw new Error("migrated should be a record");
    expect(migrated.orders).toBeUndefined();
  });

  it("targetType が order の通知を serviceOrder へ変換する", () => {
    const orderNotification = {
      ...serviceItemNotification,
      id: "notification-2",
      targetType: "order",
      targetId: "order-1",
    };
    const migrated = migrateV3ToV4({
      ...v3State(),
      notifications: { "notification-2": orderNotification },
    });
    if (!isRecord(migrated) || !isRecord(migrated.notifications)) {
      throw new Error("migrated.notifications should be a record");
    }
    const migratedNotification = migrated.notifications["notification-2"];
    if (!isRecord(migratedNotification)) throw new Error("notification-2 should be a record");
    expect(migratedNotification.targetType).toBe("serviceOrder");
  });

  it("targetType が serviceItem の通知は変換しない", () => {
    const migrated = migrateV3ToV4(v3State());
    if (!isRecord(migrated) || !isRecord(migrated.notifications)) {
      throw new Error("migrated.notifications should be a record");
    }
    const migratedNotification = migrated.notifications[serviceItemNotification.id];
    if (!isRecord(migratedNotification)) throw new Error("notification-1 should be a record");
    expect(migratedNotification.targetType).toBe("serviceItem");
  });

  it("非オブジェクトや欠損キーは例外を投げず通す（後段サルベージに委ねる）", () => {
    expect(migrateV3ToV4(null)).toBeNull();
    expect(migrateV3ToV4("broken")).toBe("broken");
    const migrated = migrateV3ToV4({ vendors: 42, records: "broken" });
    if (!isRecord(migrated)) throw new Error("migrated should be a record");
    expect(migrated.records).toBe("broken");
    expect(salvagePersistedState(migrated)).toEqual(emptyAppState());
  });
});

describe("migrateV4ToV5: record→serviceRecord リネーム（D-050）", () => {
  it("v4 データを v5 スキーマへ変換し、全体パースが成功する", () => {
    const migrated = migrateV4ToV5(migrateV3ToV4(v3State()));
    const salvaged = salvagePersistedState(migrated);
    expect(Object.keys(salvaged.serviceRecords)).toEqual(["record-1"]);
    expect(salvaged.serviceRecords["record-1"]?.serviceOrderId).toBe("order-1");
    if (!isRecord(migrated)) throw new Error("migrated should be a record");
    expect(migrated.records).toBeUndefined();
  });

  it("非オブジェクトや欠損キーは例外を投げず通す（後段サルベージに委ねる）", () => {
    expect(migrateV4ToV5(null)).toBeNull();
    expect(migrateV4ToV5("broken")).toBe("broken");
    const migrated = migrateV4ToV5({ vendors: 42, records: "broken" });
    if (!isRecord(migrated)) throw new Error("migrated should be a record");
    expect(migrated.serviceRecords).toBe("broken");
    expect(salvagePersistedState(migrated)).toEqual(emptyAppState());
  });
});

describe("マイグレーションパイプライン（v1→現行版）", () => {
  it("MIGRATIONS に全ステップが登録されており、v1 データが現行スキーマまで変換される", () => {
    const result = migratePersistedState(v1State(), 1);
    const salvaged = salvagePersistedState(result);
    expect(Object.keys(salvaged.serviceItems)).toEqual(["item-1"]);
    expect(salvaged.serviceRecords["record-1"]?.serviceItemId).toBe("item-1");
    expect(salvaged.serviceOrders["order-1"]?.serviceItemId).toBe("item-1");
    expect(salvaged.notifications["notification-1"]?.targetType).toBe("serviceItem");
    if (!isRecord(result)) throw new Error("result should be a record");
    expect(result.items).toBeUndefined();
    expect(result.inspectionItems).toBeUndefined();
    expect(result.orders).toBeUndefined();
    expect(result.records).toBeUndefined();
  });
});

describe("salvagePersistedState: 3段サルベージ", () => {
  it("段階1: 全体パース成功ならそのまま採用する", () => {
    expect(salvagePersistedState(validState())).toEqual(validState());
  });

  it("段階2: 一部レコード破損時は成功分のみ救済する", () => {
    const corrupted = {
      ...validState(),
      vendors: {
        [vendor.id]: vendor,
        "vendor-broken": { id: "vendor-broken", name: "" }, // name 空 + 必須boolean欠落
      },
      serviceItems: {
        [serviceItem.id]: serviceItem,
        "item-broken": { ...serviceItem, id: "item-broken", cycle: "13M" }, // 列挙外の周期
      },
    };
    const salvaged = salvagePersistedState(corrupted);
    expect(Object.keys(salvaged.vendors)).toEqual([vendor.id]);
    expect(Object.keys(salvaged.serviceItems)).toEqual([serviceItem.id]);
    expect(salvaged.persons).toEqual(validState().persons);
  });

  it("段階2: エンティティキー自体が壊れていても他エンティティは救済する", () => {
    const corrupted = { ...validState(), serviceRecords: "not-an-object" };
    const salvaged = salvagePersistedState(corrupted);
    expect(salvaged.serviceRecords).toEqual({});
    expect(salvaged.vendors).toEqual(validState().vendors);
  });

  it.each([null, undefined, 42, "corrupted"])(
    "段階3: オブジェクトですらない永続化データ（%s）は初期状態を採用する",
    (persisted) => {
      expect(salvagePersistedState(persisted)).toEqual(emptyAppState());
    },
  );
});

describe("sanitizeAppState: 参照整合（D-003）", () => {
  it("参照が全て健在な通知は保持する", () => {
    expect(sanitizeAppState(validState()).notifications).toEqual(validState().notifications);
  });

  it("target の項目を失った通知を除去する", () => {
    const state = { ...validState(), serviceItems: {} };
    expect(sanitizeAppState(state).notifications).toEqual({});
  });

  it("target の案件を失った serviceOrder 宛通知を除去する", () => {
    const serviceOrderNotification: Notification = {
      ...serviceItemNotification,
      id: "notification-2",
      targetType: "serviceOrder",
      targetId: "order-gone",
    };
    const state = {
      ...validState(),
      notifications: { [serviceOrderNotification.id]: serviceOrderNotification },
    };
    expect(sanitizeAppState(state).notifications).toEqual({});
  });

  it("宛先 Person を失った通知を除去する", () => {
    const state = { ...validState(), persons: {} };
    expect(sanitizeAppState(state).notifications).toEqual({});
  });

  it("ユーザー入力データは dangling FK があっても保持する", () => {
    const state = { ...validState(), equipment: {}, vendors: {} };
    const sanitized = sanitizeAppState(state);
    expect(sanitized.serviceItems).toEqual(validState().serviceItems); // equipmentId/vendorId が dangling でも残す
    expect(sanitized.serviceOrders).toEqual(validState().serviceOrders);
  });
});

describe("persist 統合（LocalStorage → rehydrate）", () => {
  beforeEach(setupStoreIsolation);

  it("破損混在の LocalStorage から有効レコードのみ復元する", async () => {
    const persisted = {
      state: {
        ...validState(),
        persons: {
          [person.id]: person,
          "person-broken": { id: "person-broken" }, // 必須フィールド欠落
        },
      },
      version: STORAGE_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));

    await useAppStore.persist.rehydrate();
    const state = useAppStore.getState();
    expect(Object.keys(state.persons)).toEqual([person.id]);
    expect(state.serviceItems[serviceItem.id]).toEqual(serviceItem);
    // アクションは merge 後も失われない
    expect(typeof state.addServiceRecord).toBe("function");
  });

  it("アクション実行で partialize されたエンティティのみが保存される", () => {
    useAppStore.getState().addPerson({ name: "佐藤", email: "sato@example.com", isActive: true });

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    if (raw === null) throw new Error("raw should not be null");
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.state)) {
      throw new Error("persisted state shape unexpected");
    }
    expect(Object.keys(parsed.state).toSorted()).toEqual([
      "equipment",
      "notifications",
      "persons",
      "serviceItems",
      "serviceOrders",
      "serviceRecords",
      "vendors",
    ]);
  });
});
