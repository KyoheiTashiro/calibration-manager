/**
 * 次回期限の計算（domain-model.md §4.1）。
 * `nextDueDate = lastDoneDate + cycle`。月単位の加算は暦月ベースで、
 * 加算先の月に同じ日が存在しない場合は月末へ繰り上がり調整する（例: 1/31 + 1M → 2/28）。
 */

import { CYCLE, type Cycle, type IsoDateString } from "@/store/types";
import { daysInMonth, formatIsoDate, parseIsoDate } from "@/utils/time";

/** 1年 = 12ヶ月（周期の年→月換算に使用） */
const MONTHS_PER_YEAR = 12;

/**
 * 周期→加算月数の対応表。
 * なぜ satisfies か: CYCLE に値が追加された際にこの表の網羅漏れをビルドエラーで検出するため。
 */
const CYCLE_MONTHS = {
  [CYCLE.M1]: 1,
  [CYCLE.M3]: 3,
  [CYCLE.M6]: 6,
  [CYCLE.Y1]: MONTHS_PER_YEAR,
  [CYCLE.Y2]: 2 * MONTHS_PER_YEAR,
  [CYCLE.Y3]: 3 * MONTHS_PER_YEAR,
  [CYCLE.Y5]: 5 * MONTHS_PER_YEAR,
  [CYCLE.Y10]: 10 * MONTHS_PER_YEAR,
} as const satisfies Record<Cycle, number>;

/**
 * `YYYY-MM-DD` に周期を暦月ベースで加算する。
 * - 日は維持し、加算先の月に存在しない日は月末へ丸める（1/31 + 1M → 2/28、2024-01-31 + 1M → 2024-02-29）
 * - 入力が `YYYY-MM-DD` として不正な場合は null（例外を投げない。coding-standards.md §8）
 *
 * なぜ Date の setMonth を使わないか: Date は「2026-01-31 に +1ヶ月」で 3/3 へ溢れる仕様であり、
 * 本ドメインの月末丸め仕様と食い違うため、年月日を自前で計算する。
 */
export const addCycle = (isoDate: IsoDateString, cycle: Cycle): IsoDateString | null => {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return null;
  const totalMonths = parsed.month - 1 + CYCLE_MONTHS[cycle];
  const year = parsed.year + Math.floor(totalMonths / MONTHS_PER_YEAR);
  const month = (totalMonths % MONTHS_PER_YEAR) + 1;
  const day = Math.min(parsed.day, daysInMonth(year, month));
  return formatIsoDate({ year, month, day });
};
