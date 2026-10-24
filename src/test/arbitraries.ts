/**
 * fast-check の Arbitrary 定義集約。
 * property test（*.proptest.test.ts）はここから生成器を import し、
 * 各テストファイルで生成器を重複定義しない。
 */

import { PHONE_PATTERN } from '@/constants/textLimits';
import {
  type ServiceOrder,
  CYCLE,
  type Cycle,
  EXECUTION,
  type ServiceItem,
  type IsoDateString,
  SERVICE_ITEM_TYPE,
  SERVICE_ORDER_STATUS,
  type Person,
  type Vendor,
} from '@/store/types';
import { daysInMonth, formatIsoDate } from '@/utils/time';
// なぜワイルドカード import か: fast-check は `fc.integer()` のようにプレフィックス付きで使うのが
// 公式慣習であり、named import では `string` / `record` 等の汎用名がスコープを汚染するため。
import * as fc from 'fast-check';

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
  // なぜ半角数字・ハイフンのみか: 電話番号形式チェック(PHONE_PATTERN)を通る値のみ生成するため
  phone: optionalArb(fc.stringMatching(PHONE_PATTERN)),
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
