import { daysInMonth, weekdayOf } from "@/utils/time";

/** 月グリッドの1マス。月の日数に含まれない空白セルは null */
export type CalendarCell = number | null;

/** 年月（月は1〜12。Date の 0 始まりと混同しないため time.ts と表記を統一） */
export type YearMonth = { year: number; month: number };

/**
 * 指定年月の月グリッドを構築する。
 * 月初の曜日分だけ先頭に空セルを挿入し、日数分のセルを続け、
 * 7の倍数になるよう末尾にも空セルを埋めて7列×n行の週配列にする。
 */
export const buildMonthWeeks = (year: number, month: number): CalendarCell[][] => {
  const leadingBlankCount = weekdayOf(year, month, 1);
  const totalDays = daysInMonth(year, month);
  const cells: CalendarCell[] = [
    ...Array.from({ length: leadingBlankCount }, () => null),
    ...Array.from({ length: totalDays }, (_unused, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
};

/**
 * 年月を月単位で delta だけ移動する（月は1〜12、年またぎ・複数月分の移動に対応）。
 * なぜこの計算式か: month-1 で0始まりに揃えてから delta を加算し、
 * 12 での床除算（Math.floor）で繰り上げ/繰り下げの年数を求める。
 * JS の `%` は負値で負を返すため、+12 してから %12 することで 0〜11 に正規化する。
 */
export const shiftMonth = (year: number, month: number, delta: number): YearMonth => {
  const zeroBasedTotal = month - 1 + delta;
  const normalizedMonth = ((zeroBasedTotal % 12) + 12) % 12;
  const yearOffset = Math.floor(zeroBasedTotal / 12);
  return { year: year + yearOffset, month: normalizedMonth + 1 };
};

/** 年月日を持つ最小限の形（parseIsoDate の戻り値と互換） */
export type CalendarDayLike = { year: number; month: number; day: number };

/**
 * `target`（null 許容）が year/month/day と一致するかを判定する。
 * カレンダーグリッドの「選択日」「今日」ハイライト判定を共通化する。
 */
export const isSameYearMonthDay = (
  target: CalendarDayLike | null,
  year: number,
  month: number,
  day: number,
): boolean => target?.year === year && target.month === month && target.day === day;

/** 日セルの Tailwind クラスを状態から決定する（選択 > 今日 > 通常の優先度） */
export const dayCellClassName = (isSelected: boolean, isToday: boolean): string => {
  const base = "flex h-8 w-full items-center justify-center rounded text-sm";
  if (isSelected) return `${base} bg-primary text-white`;
  if (isToday) return `${base} border border-primary text-primary`;
  return `${base} hover:bg-slate-100`;
};
