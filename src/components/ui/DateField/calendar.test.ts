import {
  buildMonthWeeks,
  dayCellClassName,
  isSameYearMonthDay,
  shiftMonth,
} from '@/components/ui/DateField/calendar';
import { describe, expect, it } from 'vitest';

describe('buildMonthWeeks', () => {
  it('月初が水曜（2026年7月）は先頭に3個の空セルが入り31日分が続く', () => {
    const weeks = buildMonthWeeks(2026, 7);

    const nonBlankCells = weeks.flat().filter((cell) => cell !== null);
    expect(weeks[0]).toEqual([null, null, null, 1, 2, 3, 4]);
    expect(nonBlankCells).toHaveLength(31);
    expect(nonBlankCells.at(-1)).toBe(31);
  });

  it('月初が日曜（2026年2月）は先頭に空セルが入らない', () => {
    const weeks = buildMonthWeeks(2026, 2);

    expect(weeks[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weeks.flat().filter((cell) => cell !== null)).toHaveLength(28);
  });

  it('閏年の2月（2024年）は29日まで生成される', () => {
    const weeks = buildMonthWeeks(2024, 2);

    const nonBlankCells = weeks.flat().filter((cell) => cell !== null);
    expect(nonBlankCells).toHaveLength(29);
    expect(nonBlankCells.at(-1)).toBe(29);
  });

  it('すべての週は7列で構成される', () => {
    const weeks = buildMonthWeeks(2026, 4);

    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it('末尾は7の倍数になるよう空セルで埋められる', () => {
    const weeks = buildMonthWeeks(2026, 4);
    const totalCells = weeks.flat().length;

    expect(totalCells % 7).toBe(0);
    expect(weeks.flat().at(-1)).toBeNull();
  });
});

describe('shiftMonth', () => {
  it('同一年内の翌月に移動する', () => {
    expect(shiftMonth(2026, 7, 1)).toEqual({ year: 2026, month: 8 });
  });

  it('同一年内の前月に移動する', () => {
    expect(shiftMonth(2026, 7, -1)).toEqual({ year: 2026, month: 6 });
  });

  it('12月から翌月へは年をまたいで1月になる', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('1月から前月へは年をまたいで前年12月になる', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('複数月分の移動にも対応する（年をまたぐ加算）', () => {
    expect(shiftMonth(2026, 11, 3)).toEqual({ year: 2027, month: 2 });
  });

  it('複数月分の移動にも対応する（年をまたぐ減算）', () => {
    expect(shiftMonth(2026, 2, -3)).toEqual({ year: 2025, month: 11 });
  });

  it('delta=0 は同じ年月を返す', () => {
    expect(shiftMonth(2026, 7, 0)).toEqual({ year: 2026, month: 7 });
  });
});

describe('isSameYearMonthDay', () => {
  it('year/month/day が一致すれば true', () => {
    expect(isSameYearMonthDay({ year: 2026, month: 7, day: 3 }, 2026, 7, 3)).toBe(true);
  });

  it('day のみ異なる場合は false', () => {
    expect(isSameYearMonthDay({ year: 2026, month: 7, day: 3 }, 2026, 7, 4)).toBe(false);
  });

  it('target が null の場合は false', () => {
    expect(isSameYearMonthDay(null, 2026, 7, 3)).toBe(false);
  });
});

describe('dayCellClassName', () => {
  it('選択日は bg-primary を含む', () => {
    expect(dayCellClassName(true, false)).toContain('bg-primary');
  });

  it('選択日でない今日は border-primary を含む', () => {
    expect(dayCellClassName(false, true)).toContain('border-primary');
  });

  it('選択日かつ今日でも選択優先で bg-primary になる', () => {
    expect(dayCellClassName(true, true)).toContain('bg-primary');
  });

  it('通常セルは hover:bg-slate-100 を含む', () => {
    expect(dayCellClassName(false, false)).toContain('hover:bg-slate-100');
  });
});
