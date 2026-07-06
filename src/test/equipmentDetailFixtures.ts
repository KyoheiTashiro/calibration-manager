/**
 * detail.test.tsx / serviceRecordLaunch.test.tsx の2テストファイルで共有するテスト用フィクスチャ。
 * どちらか一方へ取り込むと他方がテストファイルをimportする形になるため、独立ファイルとして維持する。
 */

import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  SERVICE_ITEM_TYPE,
  SERVICE_RECORD_RESULT,
  type Equipment,
  type ServiceItem,
  type ServiceRecord,
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
export const serviceItemOverdue: ServiceItem = {
  id: "item-overdue",
  equipmentId: equipmentFull.id,
  type: SERVICE_ITEM_TYPE.INSPECTION,
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
export const serviceItemOkInactivePerson: ServiceItem = {
  id: "item-ok",
  equipmentId: equipmentFull.id,
  type: SERVICE_ITEM_TYPE.INSPECTION,
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
export const serviceItemDeactivated: ServiceItem = {
  id: "item-deactivated",
  equipmentId: equipmentFull.id,
  type: SERVICE_ITEM_TYPE.INSPECTION,
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
export const serviceItemExternal: ServiceItem = {
  id: "item-external",
  equipmentId: equipmentFull.id,
  type: SERVICE_ITEM_TYPE.CALIBRATION,
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
export const serviceItemOfSuspendedEquipment: ServiceItem = {
  id: "item-suspended",
  equipmentId: equipmentSuspended.id,
  type: SERVICE_ITEM_TYPE.INSPECTION,
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
export const recordOverdueServiceItem: ServiceRecord = {
  id: "record-a",
  serviceItemId: serviceItemOverdue.id,
  doneDate: "2026-06-25",
  doneBy: "鈴木",
  result: SERVICE_RECORD_RESULT.PASS,
};

export const recordExternalServiceItemSameDay: ServiceRecord = {
  id: "record-b",
  serviceItemId: serviceItemExternal.id,
  doneDate: "2026-06-25",
  doneBy: "田中",
  result: SERVICE_RECORD_RESULT.FAIL,
};

export const recordExternalServiceItemOlder: ServiceRecord = {
  id: "record-c",
  serviceItemId: serviceItemExternal.id,
  doneDate: "2025-06-18",
  doneBy: "ミツトヨ校正センター",
  result: SERVICE_RECORD_RESULT.ADJUSTED,
  note: "証明書#A-102",
};

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

export const seedEquipmentFullServiceItemsAndRecords = (): void => {
  seedStore({
    serviceItems: {
      [serviceItemOverdue.id]: serviceItemOverdue,
      [serviceItemOkInactivePerson.id]: serviceItemOkInactivePerson,
      [serviceItemDeactivated.id]: serviceItemDeactivated,
      [serviceItemExternal.id]: serviceItemExternal,
    },
    serviceRecords: {
      [recordOverdueServiceItem.id]: recordOverdueServiceItem,
      [recordExternalServiceItemSameDay.id]: recordExternalServiceItemSameDay,
      [recordExternalServiceItemOlder.id]: recordExternalServiceItemOlder,
    },
  });
};
