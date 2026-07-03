/**
 * ItemModal.test.tsx / ItemModal.edit.test.tsx で共有するテスト用フィクスチャ。
 * なぜ分割するか: 全テストケースを1ファイルに収めると eslint(max-lines) の300行上限を
 * 超過するため（テストケース数が仕様上多い）、フィクスチャ部分をこのファイルへ切り出した。
 */

import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  ITEM_TYPE,
  type Equipment,
  type InspectionItem,
  type Person,
  type Vendor,
} from "@/store/types";
import { seedStore } from "@/test/renderWithStore";

export const equipment: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  status: EQUIPMENT_STATUS.ACTIVE,
};

export const calibratorVendor: Vendor = {
  id: "vendor-1",
  name: "ミツトヨ校正センター",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 20,
};

export const manufacturerOnlyVendor: Vendor = {
  id: "vendor-2",
  name: "メーカーのみ商事",
  isManufacturer: true,
  isCalibrator: false,
};

export const activePerson: Person = {
  id: "person-1",
  name: "田中",
  email: "tanaka@example.com",
  isActive: true,
};

export const inactivePerson: Person = {
  id: "person-2",
  name: "鈴木",
  email: "suzuki@example.com",
  isActive: false,
};

export const anotherInactivePerson: Person = {
  id: "person-3",
  name: "佐藤",
  email: "sato@example.com",
  isActive: false,
};

export const existingItem: InspectionItem = {
  id: "item-1",
  equipmentId: equipment.id,
  type: ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: CYCLE.Y1,
  execution: EXECUTION.EXTERNAL,
  vendorId: calibratorVendor.id,
  leadTimeDays: 20,
  bufferDays: 10,
  personId: activePerson.id,
  noticeDaysBefore: 25,
  lastDoneDate: "2025-06-01",
  nextDueDate: "2026-06-01",
  isActive: true,
};

/** 機器・校正業者/非校正業者Vendor・有効担当者をストアへ投入する共通シード */
export const seedBaseMasters = (): void => {
  seedStore({
    equipment: { [equipment.id]: equipment },
    vendors: {
      [calibratorVendor.id]: calibratorVendor,
      [manufacturerOnlyVendor.id]: manufacturerOnlyVendor,
    },
    persons: { [activePerson.id]: activePerson },
  });
};
