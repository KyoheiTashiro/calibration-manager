/**
 * index.test.tsx / inspectionItemTable.test.tsx / history.test.tsx / modalLaunch.test.tsx で共有する
 * テスト用フィクスチャ。なぜ分割するか: InspectionItemModal.test.tsx と同じ理由（inspectionItemModalFixtures.ts
 * 参照）で、全テストケースを1ファイルに収めると oxlint(max-lines) の300行上限を超過するため、
 * フィクスチャ部分をこのファイルへ切り出した。
 */

import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  INSPECTION_ITEM_TYPE,
  RECORD_RESULT,
  type Equipment,
  type InspectionItem,
  type InspectionRecord,
  type Person,
  type Vendor,
} from "@/store/types";
import { seedStore } from "@/test/renderWithStore";

/** 全属性を持つ稼働機器（基本情報カードのメーカー解決・状態バッジ表示を検証する） */
export const equipmentFull: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  model: "CD-15",
  serialNo: "1234567",
  manufacturerId: "vendor-manufacturer",
  location: "検査室",
  status: EQUIPMENT_STATUS.ACTIVE,
  note: "校正用マスターと同時保管",
};

/** 任意属性を持たない稼働機器（空の任意項目が「—」表示になることを検証する） */
export const equipmentMinimal: Equipment = {
  id: "equipment-2",
  managementNo: "EQ-002",
  name: "マイクロメータ",
  status: EQUIPMENT_STATUS.ACTIVE,
};

/** 休止機器（D-014: ステータスバッジ非表示 = 「—」を検証する） */
export const equipmentSuspended: Equipment = {
  id: "equipment-3",
  managementNo: "EQ-003",
  name: "圧力計",
  status: EQUIPMENT_STATUS.SUSPENDED,
};

export const manufacturerVendor: Vendor = {
  id: "vendor-manufacturer",
  name: "ミツトヨ",
  isManufacturer: true,
  isCalibrator: false,
};

export const calibratorVendor: Vendor = {
  id: "vendor-calibrator",
  name: "ミツトヨ校正センター",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 20,
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

/** 期限切れ(overdue)。nextDueDateを固定日にしてtodayIsoDate依存のflakinessを避ける */
export const inspectionItemOverdue: InspectionItem = {
  id: "item-overdue",
  equipmentId: equipmentFull.id,
  type: INSPECTION_ITEM_TYPE.INSPECTION,
  name: "月次点検",
  cycle: CYCLE.M1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: activePerson.id,
  noticeDaysBefore: 30,
  nextDueDate: "2000-01-01",
  isActive: true,
};

/** 期限に余裕がある(ok)項目。担当者を無効化済みpersonにして「(無効)」注記を検証する */
export const inspectionItemOkInactivePerson: InspectionItem = {
  id: "item-ok",
  equipmentId: equipmentFull.id,
  type: INSPECTION_ITEM_TYPE.INSPECTION,
  name: "外観点検",
  cycle: CYCLE.M3,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: inactivePerson.id,
  noticeDaysBefore: 30,
  nextDueDate: "2099-01-01",
  isActive: true,
};

/** isActive=false の項目（末尾ソート・淡色表示を検証する） */
export const inspectionItemDeactivated: InspectionItem = {
  id: "item-deactivated",
  equipmentId: equipmentFull.id,
  type: INSPECTION_ITEM_TYPE.INSPECTION,
  name: "廃止予定項目",
  cycle: CYCLE.Y1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: activePerson.id,
  noticeDaysBefore: 30,
  nextDueDate: "2010-01-01",
  isActive: false,
};

/** 外部・校正の項目(種別/内外ラベル、実施記録の項目横断マージ検証用) */
export const inspectionItemExternal: InspectionItem = {
  id: "item-external",
  equipmentId: equipmentFull.id,
  type: INSPECTION_ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: CYCLE.Y1,
  execution: EXECUTION.EXTERNAL,
  vendorId: calibratorVendor.id,
  leadTimeDays: 20,
  bufferDays: 10,
  personId: activePerson.id,
  noticeDaysBefore: 25,
  nextDueDate: "2030-01-01",
  isActive: true,
};

/** 休止機器(equipmentSuspended)配下の項目。期限切れだがD-014でバッジ非表示になることを検証する */
export const inspectionItemOfSuspendedEquipment: InspectionItem = {
  id: "item-suspended",
  equipmentId: equipmentSuspended.id,
  type: INSPECTION_ITEM_TYPE.INSPECTION,
  name: "定期点検",
  cycle: CYCLE.M6,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: activePerson.id,
  noticeDaysBefore: 30,
  nextDueDate: "2000-01-01",
  isActive: true,
};

/** 同一doneDateのレコードを含め、id昇順タイブレークを検証する */
export const recordOverdueInspectionItem: InspectionRecord = {
  id: "record-a",
  inspectionItemId: inspectionItemOverdue.id,
  doneDate: "2026-06-25",
  doneBy: "鈴木",
  result: RECORD_RESULT.PASS,
};

export const recordExternalInspectionItemSameDay: InspectionRecord = {
  id: "record-b",
  inspectionItemId: inspectionItemExternal.id,
  doneDate: "2026-06-25",
  doneBy: "田中",
  result: RECORD_RESULT.FAIL,
};

export const recordExternalInspectionItemOlder: InspectionRecord = {
  id: "record-c",
  inspectionItemId: inspectionItemExternal.id,
  doneDate: "2025-06-18",
  doneBy: "ミツトヨ校正センター",
  result: RECORD_RESULT.ADJUSTED,
  note: "証明書#A-102",
};

/** equipmentFull + 関連マスタ(メーカー/校正業者/担当者)をストアへ投入する共通シード */
export const seedEquipmentFullMasters = (): void => {
  seedStore({
    equipment: { [equipmentFull.id]: equipmentFull },
    vendors: {
      [manufacturerVendor.id]: manufacturerVendor,
      [calibratorVendor.id]: calibratorVendor,
    },
    persons: {
      [activePerson.id]: activePerson,
      [inactivePerson.id]: inactivePerson,
    },
  });
};

/** equipmentFull配下の全項目・全実施記録をストアへ投入する */
export const seedEquipmentFullInspectionItemsAndRecords = (): void => {
  seedStore({
    inspectionItems: {
      [inspectionItemOverdue.id]: inspectionItemOverdue,
      [inspectionItemOkInactivePerson.id]: inspectionItemOkInactivePerson,
      [inspectionItemDeactivated.id]: inspectionItemDeactivated,
      [inspectionItemExternal.id]: inspectionItemExternal,
    },
    records: {
      [recordOverdueInspectionItem.id]: recordOverdueInspectionItem,
      [recordExternalInspectionItemSameDay.id]: recordExternalInspectionItemSameDay,
      [recordExternalInspectionItemOlder.id]: recordExternalInspectionItemOlder,
    },
  });
};
