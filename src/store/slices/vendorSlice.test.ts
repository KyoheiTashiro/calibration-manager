/**
 * vendorSlice の検証。removeVendor の参照ガードは store.md「アクション仕様」準拠。
 */

import type { ServiceOrder, Equipment, ServiceItem, Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { beforeEach, describe, expect, it } from "vitest";

const vendor: Vendor = { id: "vendor-1", name: "校正社", isManufacturer: true, isCalibrator: true };
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
  nextDueDate: "2026-07-15",
  isActive: true,
};
const serviceOrder: ServiceOrder = {
  id: "serviceOrder-1",
  serviceItemId: "item-1",
  vendorId: "vendor-1",
  status: "returned",
};

beforeEach(setupStoreIsolation);

describe("addVendor / updateVendor", () => {
  it("追加した Vendor を返却された id で参照できる", () => {
    const id = useAppStore
      .getState()
      .addVendor({ name: "機器メーカー", isManufacturer: true, isCalibrator: false });
    expect(useAppStore.getState().vendors[id]).toMatchObject({ id, name: "機器メーカー" });
  });

  it("部分更新できる（他フィールドは維持）", () => {
    seedStore({ vendors: { [vendor.id]: vendor } });
    useAppStore.getState().updateVendor(vendor.id, { standardLeadTimeDays: 21 });
    expect(useAppStore.getState().vendors[vendor.id]).toEqual({
      ...vendor,
      standardLeadTimeDays: 21,
    });
  });

  it("存在しない id の更新は no-op", () => {
    useAppStore.getState().updateVendor("vendor-gone", { name: "無" });
    expect(useAppStore.getState().vendors).toEqual({});
  });
});

describe("removeVendor: 参照ガード", () => {
  it("どこからも参照されていなければ削除して true", () => {
    seedStore({ vendors: { [vendor.id]: vendor } });
    expect(useAppStore.getState().removeVendor(vendor.id)).toBe(true);
    expect(useAppStore.getState().vendors).toEqual({});
  });

  it("Equipment.manufacturerId から参照中は no-op（false）", () => {
    seedStore({
      vendors: { [vendor.id]: vendor },
      equipment: { [equipment.id]: { ...equipment, manufacturerId: vendor.id } },
    });
    expect(useAppStore.getState().removeVendor(vendor.id)).toBe(false);
    expect(useAppStore.getState().vendors[vendor.id]).toEqual(vendor);
  });

  it("ServiceItem.vendorId から参照中は no-op（false）", () => {
    seedStore({
      vendors: { [vendor.id]: vendor },
      serviceItems: { [serviceItem.id]: serviceItem },
    });
    expect(useAppStore.getState().removeVendor(vendor.id)).toBe(false);
  });

  it("ServiceOrder.vendorId から参照中は no-op（false）", () => {
    seedStore({
      vendors: { [vendor.id]: vendor },
      serviceOrders: { [serviceOrder.id]: serviceOrder },
    });
    expect(useAppStore.getState().removeVendor(vendor.id)).toBe(false);
  });

  it("存在しない Vendor は false", () => {
    expect(useAppStore.getState().removeVendor("vendor-gone")).toBe(false);
  });
});
