import {
  appStateSchema,
  calibrationOrderSchema,
  inspectionItemSchema,
  vendorSchema,
} from "@/store/schema";
import { describe, expect, it } from "vitest";

const validInspectionItem = {
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

describe("inspectionItemSchema", () => {
  it("妥当な項目を受理する", () => {
    expect(inspectionItemSchema.safeParse(validInspectionItem).success).toBe(true);
  });

  it("external なのに vendorId が無い項目を拒否する（相関制約）", () => {
    const { vendorId: _dropped, ...withoutVendor } = validInspectionItem;
    expect(inspectionItemSchema.safeParse(withoutVendor).success).toBe(false);
  });

  it("internal なら vendorId 無しでも受理する", () => {
    const { vendorId: _dropped, ...withoutVendor } = validInspectionItem;
    expect(
      inspectionItemSchema.safeParse({ ...withoutVendor, execution: "internal" }).success,
    ).toBe(true);
  });

  it("暦上あり得ない日付（2026-02-30）を拒否する", () => {
    expect(
      inspectionItemSchema.safeParse({ ...validInspectionItem, nextDueDate: "2026-02-30" }).success,
    ).toBe(false);
  });

  it("未知の cycle 値を拒否する", () => {
    expect(inspectionItemSchema.safeParse({ ...validInspectionItem, cycle: "4M" }).success).toBe(
      false,
    );
  });

  it("負の日数（bufferDays）を拒否する", () => {
    expect(inspectionItemSchema.safeParse({ ...validInspectionItem, bufferDays: -1 }).success).toBe(
      false,
    );
  });
});

describe("vendorSchema", () => {
  it("必須属性のみでも受理する（任意属性は省略可）", () => {
    const minimal = {
      id: "vendor-1",
      name: "テスト校正",
      isManufacturer: false,
      isCalibrator: true,
    };
    expect(vendorSchema.safeParse(minimal).success).toBe(true);
  });

  it("name が空文字のレコードを拒否する", () => {
    const noName = { id: "vendor-1", name: "", isManufacturer: false, isCalibrator: true };
    expect(vendorSchema.safeParse(noName).success).toBe(false);
  });
});

describe("calibrationOrderSchema", () => {
  it("負の費用を拒否する", () => {
    const order = {
      id: "o-1",
      inspectionItemId: "i-1",
      vendorId: "v-1",
      status: "planned",
      cost: -100,
    };
    expect(calibrationOrderSchema.safeParse(order).success).toBe(false);
  });

  it("未知の status を拒否する", () => {
    const order = { id: "o-1", inspectionItemId: "i-1", vendorId: "v-1", status: "shipping" };
    expect(calibrationOrderSchema.safeParse(order).success).toBe(false);
  });
});

describe("appStateSchema", () => {
  const emptyState = {
    vendors: {},
    persons: {},
    equipment: {},
    inspectionItems: {},
    records: {},
    orders: {},
    notifications: {},
  };

  it("全テーブル空の初期状態を受理する", () => {
    expect(appStateSchema.safeParse(emptyState).success).toBe(true);
  });

  it("1レコードでも不正があれば全体パースは失敗する（merge のレコード単位サルベージが必要な根拠）", () => {
    const broken = {
      ...emptyState,
      inspectionItems: { "item-1": { ...validInspectionItem, nextDueDate: "破損データ" } },
    };
    expect(appStateSchema.safeParse(broken).success).toBe(false);
  });

  it("テーブル自体が欠けている場合は失敗する", () => {
    const { notifications: _dropped, ...withoutNotifications } = emptyState;
    expect(appStateSchema.safeParse(withoutNotifications).success).toBe(false);
  });
});
