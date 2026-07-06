/**
 * fast-check の Arbitrary 定義集約。
 * property test（*.proptest.test.ts）はここから生成器を import し、
 * 各テストファイルで生成器を重複定義しない。
 */

import {
  type ServiceOrder,
  CYCLE,
  type Cycle,
  type Equipment,
  EQUIPMENT_STATUS,
  EXECUTION,
  type ServiceItem,
  type ServiceRecord,
  type IsoDateString,
  SERVICE_ITEM_TYPE,
  NOTIFICATION_TARGET_TYPE,
  NOTIFICATION_TYPE,
  type Notification,
  SERVICE_ORDER_STATUS,
  type Person,
  SERVICE_RECORD_RESULT,
  type Vendor,
} from "@/store/types";
import { daysInMonth, formatIsoDate } from "@/utils/time";
// なぜワイルドカード import か: fast-check は `fc.integer()` のようにプレフィックス付きで使うのが
// 公式慣習であり、named import では `string` / `record` 等の汎用名がスコープを汚染するため。
import * as fc from "fast-check";

// なぜこの範囲か: 機器台帳で現実に扱う年代をカバーしつつ、閏年（2000年・2024年等）と
// 非閏の世紀年を含む範囲で暦計算の境界を踏ませるため。
const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

/** 暦上妥当な `YYYY-MM-DD` を生成する（月末日・閏年2/29 を含む） */
export const isoDateArb: fc.Arbitrary<IsoDateString> = fc
  .record({
    year: fc.integer({ min: MIN_YEAR, max: MAX_YEAR }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .chain(({ year, month }) =>
    fc
      .integer({ min: 1, max: daysInMonth(year, month) })
      .map((day) => formatIsoDate({ year, month, day })),
  );

export const cycleArb: fc.Arbitrary<Cycle> = fc.constantFrom(...Object.values(CYCLE));

/** 日数系属性（納期・余裕・通知開始日数）。0〜1年分程度の現実的な範囲 */
export const dayCountArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: 365 });

const optionalArb = <Value>(arb: fc.Arbitrary<Value>): fc.Arbitrary<Value | undefined> =>
  fc.option(arb, { nil: undefined });

export const vendorArb: fc.Arbitrary<Vendor> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  isManufacturer: fc.boolean(),
  isCalibrator: fc.boolean(),
  contactPerson: optionalArb(fc.string()),
  email: optionalArb(fc.string()),
  phone: optionalArb(fc.string()),
  standardLeadTimeDays: optionalArb(dayCountArb),
  note: optionalArb(fc.string()),
});

export const personArb: fc.Arbitrary<Person> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  email: fc.string({ minLength: 1 }),
  department: optionalArb(fc.string()),
  isActive: fc.boolean(),
});

export const equipmentArb: fc.Arbitrary<Equipment> = fc.record({
  id: fc.uuid(),
  managementNo: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1 }),
  model: optionalArb(fc.string()),
  serialNo: optionalArb(fc.string()),
  manufacturerId: optionalArb(fc.uuid()),
  location: optionalArb(fc.string()),
  status: fc.constantFrom(...Object.values(EQUIPMENT_STATUS)),
  note: optionalArb(fc.string()),
});

export const serviceItemArb: fc.Arbitrary<ServiceItem> = fc.record({
  id: fc.uuid(),
  equipmentId: fc.uuid(),
  type: fc.constantFrom(...Object.values(SERVICE_ITEM_TYPE)),
  name: fc.string({ minLength: 1 }),
  cycle: cycleArb,
  execution: fc.constantFrom(...Object.values(EXECUTION)),
  vendorId: optionalArb(fc.uuid()),
  leadTimeDays: optionalArb(dayCountArb),
  bufferDays: dayCountArb,
  personId: fc.uuid(),
  noticeDaysBefore: dayCountArb,
  lastDoneDate: optionalArb(isoDateArb),
  nextDueDate: isoDateArb,
  isActive: fc.boolean(),
});

export const serviceRecordArb: fc.Arbitrary<ServiceRecord> = fc.record({
  id: fc.uuid(),
  serviceItemId: fc.uuid(),
  doneDate: isoDateArb,
  doneBy: fc.string({ minLength: 1 }),
  result: fc.constantFrom(...Object.values(SERVICE_RECORD_RESULT)),
  serviceOrderId: optionalArb(fc.uuid()),
  note: optionalArb(fc.string()),
});

export const serviceOrderArb: fc.Arbitrary<ServiceOrder> = fc.record({
  id: fc.uuid(),
  serviceItemId: fc.uuid(),
  vendorId: fc.uuid(),
  status: fc.constantFrom(...Object.values(SERVICE_ORDER_STATUS)),
  orderedDate: optionalArb(isoDateArb),
  dueDate: optionalArb(isoDateArb),
  returnedDate: optionalArb(isoDateArb),
  cost: optionalArb(fc.integer({ min: 0, max: 10_000_000 })),
  note: optionalArb(fc.string()),
});

export const notificationArb: fc.Arbitrary<Notification> = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom(...Object.values(NOTIFICATION_TYPE)),
  targetType: fc.constantFrom(...Object.values(NOTIFICATION_TARGET_TYPE)),
  targetId: fc.uuid(),
  personId: fc.uuid(),
  message: fc.string({ minLength: 1 }),
  createdDate: isoDateArb,
  isRead: fc.boolean(),
});
