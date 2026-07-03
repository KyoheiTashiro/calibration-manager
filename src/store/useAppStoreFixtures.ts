/**
 * useAppStore.test.ts 用の共有フィクスチャ（vendor→person→equipment→inspectionItem の参照連鎖を持つ最小構成）。
 * テスト本体と分離しているのは max-lines(300) 対策で、検証ロジックは useAppStore.test.ts 側に残す。
 */

import type { CalibrationOrder, Equipment, InspectionItem, Person, Vendor } from "@/store/types";
import { seedStore } from "@/test/renderWithStore";

export const vendor: Vendor = {
  id: "vendor-1",
  name: "校正社",
  isManufacturer: true,
  isCalibrator: true,
};
export const person: Person = {
  id: "person-1",
  name: "田中",
  email: "tanaka@example.com",
  isActive: true,
};
export const equipment: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  status: "active",
};
export const inspectionItem: InspectionItem = {
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
export const returnedOrder: CalibrationOrder = {
  id: "order-1",
  inspectionItemId: "item-1",
  vendorId: "vendor-1",
  status: "returned",
};

/** 上記フィクスチャ一式を store へ投入する（inspectionItems のみ差し替え可） */
export const seedBase = (overrides?: {
  inspectionItems?: Record<string, InspectionItem>;
}): void => {
  seedStore({
    vendors: { [vendor.id]: vendor },
    persons: { [person.id]: person },
    equipment: { [equipment.id]: equipment },
    inspectionItems: overrides?.inspectionItems ?? { [inspectionItem.id]: inspectionItem },
  });
};
