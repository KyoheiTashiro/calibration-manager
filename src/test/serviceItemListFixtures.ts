/**
 * 項目一覧(screen-design/05-service-item-list.md)UIテストの共有フィクスチャ。
 * filters.test.tsx / table.test.tsx / modalLaunch.test.tsx で使い回す。
 *
 * ステータスは ServiceItemList 内の todayIsoDate()(実クロック)で導出されるため、
 * nextDueDate を far past(2000)/far future(2098-2099)に振り、実行日に依らず
 * overdue / inProgress / ok が決定的になるよう設計する(equipment/detail の流儀に倣う)。
 */

import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  SERVICE_ITEM_TYPE,
  SERVICE_ORDER_STATUS,
  type ServiceOrder,
  type Equipment,
  type ServiceItem,
  type Person,
  type Vendor,
} from "@/store/types";
import { seedStore } from "@/test/renderWithStore";

export const eqA: Equipment = {
  id: "eq-a",
  managementNo: "EQ-001",
  name: "ノギス",
  status: EQUIPMENT_STATUS.ACTIVE,
};
export const eqB: Equipment = {
  id: "eq-b",
  managementNo: "EQ-014",
  name: "はかり",
  status: EQUIPMENT_STATUS.ACTIVE,
};
/** 休止機器。配下項目は表示対象外(D-023) */
export const eqSuspended: Equipment = {
  id: "eq-susp",
  managementNo: "EQ-099",
  name: "圧力計",
  status: EQUIPMENT_STATUS.SUSPENDED,
};

export const calibratorVendor: Vendor = {
  id: "v-cal",
  name: "校正センター",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 20,
};

export const personTanaka: Person = {
  id: "p-tanaka",
  name: "田中",
  email: "t@x.jp",
  isActive: true,
};
export const personSato: Person = { id: "p-sato", name: "佐藤", email: "s@x.jp", isActive: true };
export const personSuzuki: Person = { id: "p-suzuki", name: "鈴木", email: "z@x.jp", isActive: false }; // prettier-ignore

/** 外部・校正・期限切れ。有効案件なし → canCreateServiceOrder=true・overdue。lastDoneDate あり */
export const serviceItemExternalOverdue: ServiceItem = {
  id: "item-ext-overdue",
  equipmentId: eqA.id,
  type: SERVICE_ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: CYCLE.Y1,
  execution: EXECUTION.EXTERNAL,
  vendorId: calibratorVendor.id,
  leadTimeDays: 20,
  bufferDays: 10,
  personId: personTanaka.id,
  noticeDaysBefore: 25,
  lastDoneDate: "2025-06-18",
  nextDueDate: "2000-01-01",
  isActive: true,
};

/** 外部・校正・進行中案件あり → canCreateServiceOrder=false・inProgress。far future で overdue にしない */
export const serviceItemExternalInProgress: ServiceItem = {
  id: "item-ext-inprogress",
  equipmentId: eqA.id,
  type: SERVICE_ITEM_TYPE.CALIBRATION,
  name: "半期校正",
  cycle: CYCLE.M6,
  execution: EXECUTION.EXTERNAL,
  vendorId: calibratorVendor.id,
  leadTimeDays: 20,
  bufferDays: 10,
  personId: personTanaka.id,
  noticeDaysBefore: 25,
  lastDoneDate: "2025-01-10",
  nextDueDate: "2098-01-01",
  isActive: true,
};

/** 内部・点検・far future(ok)。lastDoneDate 未設定・発注推奨日なし → 「—」表示2箇所 */
export const serviceItemInternalOk: ServiceItem = {
  id: "item-int-ok",
  equipmentId: eqB.id,
  type: SERVICE_ITEM_TYPE.INSPECTION,
  name: "月次点検",
  cycle: CYCLE.M1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: personSato.id,
  noticeDaysBefore: 30,
  nextDueDate: "2099-06-25",
  isActive: true,
};

/** isActive=false → 表示対象外 */
export const serviceItemInactive: ServiceItem = {
  id: "item-inactive",
  equipmentId: eqA.id,
  type: SERVICE_ITEM_TYPE.INSPECTION,
  name: "廃止項目",
  cycle: CYCLE.Y1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: personTanaka.id,
  noticeDaysBefore: 30,
  nextDueDate: "2000-01-01",
  isActive: false,
};

/** 休止機器配下の有効項目 → 表示対象外 */
export const serviceItemOnSuspended: ServiceItem = {
  id: "item-on-susp",
  equipmentId: eqSuspended.id,
  type: SERVICE_ITEM_TYPE.INSPECTION,
  name: "休止機器点検",
  cycle: CYCLE.M6,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: personSato.id,
  noticeDaysBefore: 30,
  nextDueDate: "2000-01-01",
  isActive: true,
};

/** serviceItemExternalInProgress を inProgress にする進行中(ordered)案件 */
export const serviceOrderInProgress: ServiceOrder = {
  id: "serviceOrder-1",
  serviceItemId: serviceItemExternalInProgress.id,
  vendorId: calibratorVendor.id,
  status: SERVICE_ORDER_STATUS.ORDERED,
  orderedDate: "2025-12-01",
};

/**
 * 表示対象は3行:
 * serviceItemExternalOverdue(2000) < serviceItemExternalInProgress(2098) < serviceItemInternalOk(2099) の nextDueDate 昇順。
 */
export const seedServiceItemList = (): void => {
  seedStore({
    equipment: { [eqA.id]: eqA, [eqB.id]: eqB, [eqSuspended.id]: eqSuspended },
    vendors: { [calibratorVendor.id]: calibratorVendor },
    persons: {
      [personTanaka.id]: personTanaka,
      [personSato.id]: personSato,
      [personSuzuki.id]: personSuzuki,
    },
    serviceItems: {
      [serviceItemExternalOverdue.id]: serviceItemExternalOverdue,
      [serviceItemExternalInProgress.id]: serviceItemExternalInProgress,
      [serviceItemInternalOk.id]: serviceItemInternalOk,
      [serviceItemInactive.id]: serviceItemInactive,
      [serviceItemOnSuspended.id]: serviceItemOnSuspended,
    },
    serviceOrders: { [serviceOrderInProgress.id]: serviceOrderInProgress },
  });
};
