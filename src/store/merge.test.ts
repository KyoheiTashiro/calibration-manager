/**
 * 読込パイプライン（migrate → merge 3段サルベージ → sanitize）の検証
 * （store.md「永続化」、D-003）。
 */

import { STORAGE_KEY, STORAGE_VERSION } from "@/constants/storage";
import {
  emptyAppState,
  migratePersistedState,
  migrateV1ToV2,
  salvagePersistedState,
  sanitizeAppState,
} from "@/store/persistence";
import type {
  AppState,
  CalibrationOrder,
  Equipment,
  InspectionItem,
  Notification,
  Person,
  Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { setupStoreIsolation } from "@/test/renderWithStore";
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
const inspectionItem: InspectionItem = {
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
const order: CalibrationOrder = {
  id: "order-1",
  inspectionItemId: "item-1",
  vendorId: "vendor-1",
  status: "ordered",
};
const inspectionItemNotification: Notification = {
  id: "notification-1",
  type: "dueSoon",
  targetType: "inspectionItem",
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
  inspectionItems: { [inspectionItem.id]: inspectionItem },
  records: {},
  orders: { [order.id]: order },
  notifications: { [inspectionItemNotification.id]: inspectionItemNotification },
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
        return { ...(persisted as Record<string, unknown>), migrated: true };
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

describe("migrateV1ToV2: item→inspectionItem リネーム（D-036）", () => {
  /** v1 形式の永続化データ（items キー / itemId / targetType "item"） */
  const v1State = (): Record<string, unknown> => ({
    vendors: { [vendor.id]: vendor },
    persons: { [person.id]: person },
    equipment: { [equipment.id]: equipment },
    items: { [inspectionItem.id]: inspectionItem },
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
      [inspectionItemNotification.id]: {
        ...inspectionItemNotification,
        targetType: "item",
      },
    },
  });

  it("v1 データを v2 スキーマへ変換し、全体パースが成功する", () => {
    const migrated = migrateV1ToV2(v1State());
    const salvaged = salvagePersistedState(migrated);
    expect(Object.keys(salvaged.inspectionItems)).toEqual(["item-1"]);
    expect(salvaged.records["record-1"]?.inspectionItemId).toBe("item-1");
    expect(salvaged.orders["order-1"]?.inspectionItemId).toBe("item-1");
    expect(salvaged.notifications["notification-1"]?.targetType).toBe("inspectionItem");
  });

  it("MIGRATIONS[1] として登録されており、v1→現行版のパイプラインで適用される", () => {
    const result = migratePersistedState(v1State(), 1) as Record<string, unknown>;
    expect(result["inspectionItems"]).toBeDefined();
    expect(result["items"]).toBeUndefined();
  });

  it("targetType が order の通知は変換しない", () => {
    const orderNotification = {
      ...inspectionItemNotification,
      id: "notification-2",
      targetType: "order",
      targetId: "order-1",
    };
    const migrated = migrateV1ToV2({
      ...v1State(),
      notifications: { "notification-2": orderNotification },
    }) as { notifications: Record<string, { targetType: string }> };
    expect(migrated.notifications["notification-2"]?.targetType).toBe("order");
  });

  it("非オブジェクトや欠損キーは例外を投げず通す（後段サルベージに委ねる）", () => {
    expect(migrateV1ToV2(null)).toBeNull();
    expect(migrateV1ToV2("broken")).toBe("broken");
    const migrated = migrateV1ToV2({ vendors: 42, records: "broken" }) as Record<string, unknown>;
    expect(migrated["records"]).toBe("broken");
    expect(salvagePersistedState(migrated)).toEqual(emptyAppState());
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
      inspectionItems: {
        [inspectionItem.id]: inspectionItem,
        "item-broken": { ...inspectionItem, id: "item-broken", cycle: "13M" }, // 列挙外の周期
      },
    };
    const salvaged = salvagePersistedState(corrupted);
    expect(Object.keys(salvaged.vendors)).toEqual([vendor.id]);
    expect(Object.keys(salvaged.inspectionItems)).toEqual([inspectionItem.id]);
    expect(salvaged.persons).toEqual(validState().persons);
  });

  it("段階2: エンティティキー自体が壊れていても他エンティティは救済する", () => {
    const corrupted = { ...validState(), records: "not-an-object" };
    const salvaged = salvagePersistedState(corrupted);
    expect(salvaged.records).toEqual({});
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
    const state = { ...validState(), inspectionItems: {} };
    expect(sanitizeAppState(state).notifications).toEqual({});
  });

  it("target の案件を失った order 宛通知を除去する", () => {
    const orderNotification: Notification = {
      ...inspectionItemNotification,
      id: "notification-2",
      targetType: "order",
      targetId: "order-gone",
    };
    const state = {
      ...validState(),
      notifications: { [orderNotification.id]: orderNotification },
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
    expect(sanitized.inspectionItems).toEqual(validState().inspectionItems); // equipmentId/vendorId が dangling でも残す
    expect(sanitized.orders).toEqual(validState().orders);
  });
});

describe("persist 統合（LocalStorage → rehydrate）", () => {
  beforeEach(setupStoreIsolation);

  it("破損混在の LocalStorage から有効レコードのみ復元する", () => {
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

    // プロジェクト規約で async/await 禁止のため Promise を返して完了を待つ
    return Promise.resolve(useAppStore.persist.rehydrate()).then(() => {
      const state = useAppStore.getState();
      expect(Object.keys(state.persons)).toEqual([person.id]);
      expect(state.inspectionItems[inspectionItem.id]).toEqual(inspectionItem);
      // アクションは merge 後も失われない
      expect(typeof state.addRecord).toBe("function");
    });
  });

  it("アクション実行で partialize されたエンティティのみが保存される", () => {
    useAppStore.getState().addPerson({ name: "佐藤", email: "sato@example.com", isActive: true });

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw as string) as { state: Record<string, unknown> };
    expect(Object.keys(persisted.state).toSorted()).toEqual([
      "equipment",
      "inspectionItems",
      "notifications",
      "orders",
      "persons",
      "records",
      "vendors",
    ]);
  });
});
