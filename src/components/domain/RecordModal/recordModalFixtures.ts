/**
 * RecordModal.test.tsx で共有するテスト用フィクスチャ。
 * なぜ分割するか: InspectionItemModal.test.tsx と同じ理由（inspectionItemModalFixtures.ts 参照）で、
 * 全ケースを1ファイルに収めると oxlint(max-lines) の300行上限を超過するため切り出す。
 */

import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  INSPECTION_ITEM_TYPE,
  ORDER_STATUS,
  type CalibrationOrder,
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

/** 項目の校正依頼先（external プリフィルの検証用） */
export const inspectionItemVendor: Vendor = {
  id: "vendor-item",
  name: "ミツトヨ校正センター",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 20,
};

/** 案件の依頼先（order 経由プリフィルが inspectionItem 側でなく order 側の業者名になることの検証用） */
export const orderVendor: Vendor = {
  id: "vendor-order",
  name: "校正ラボ東京",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 15,
};

export const person: Person = {
  id: "person-1",
  name: "田中",
  email: "tanaka@example.com",
  isActive: true,
};

/** 外部項目（doneBy プリフィルが inspectionItem の業者名になる） */
export const inspectionItemExternal: InspectionItem = {
  id: "item-external",
  equipmentId: equipment.id,
  type: INSPECTION_ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: CYCLE.Y1,
  execution: EXECUTION.EXTERNAL,
  vendorId: inspectionItemVendor.id,
  leadTimeDays: 20,
  bufferDays: 10,
  personId: person.id,
  noticeDaysBefore: 25,
  nextDueDate: "2030-01-01",
  isActive: true,
};

/** 内部項目（doneBy プリフィルが空欄になる） */
export const inspectionItemInternal: InspectionItem = {
  id: "item-internal",
  equipmentId: equipment.id,
  type: INSPECTION_ITEM_TYPE.INSPECTION,
  name: "月次点検",
  cycle: CYCLE.M1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: person.id,
  noticeDaysBefore: 30,
  nextDueDate: "2030-01-01",
  isActive: true,
};

/** returned 案件（completed へ遷移可能）。order 経由起動の正常系 */
export const orderReturned: CalibrationOrder = {
  id: "order-returned",
  inspectionItemId: inspectionItemExternal.id,
  vendorId: orderVendor.id,
  status: ORDER_STATUS.RETURNED,
};

/** planned 案件（completed へ遷移不可）。addRecord が null を返す異常系の検証用 */
export const orderPlanned: CalibrationOrder = {
  id: "order-planned",
  inspectionItemId: inspectionItemExternal.id,
  vendorId: orderVendor.id,
  status: ORDER_STATUS.PLANNED,
};

/** 機器・業者・担当者・両項目・両案件をストアへ投入する共通シード */
export const seedRecordModalStore = (): void => {
  seedStore({
    equipment: { [equipment.id]: equipment },
    vendors: {
      [inspectionItemVendor.id]: inspectionItemVendor,
      [orderVendor.id]: orderVendor,
    },
    persons: { [person.id]: person },
    inspectionItems: {
      [inspectionItemExternal.id]: inspectionItemExternal,
      [inspectionItemInternal.id]: inspectionItemInternal,
    },
    orders: {
      [orderReturned.id]: orderReturned,
      [orderPlanned.id]: orderPlanned,
    },
  });
};
