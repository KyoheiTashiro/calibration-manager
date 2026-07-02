import { addCycle } from "@/domain/dateCycle";
import { CYCLE, type Cycle } from "@/store/types";
import { cycleArb, isoDateArb } from "@/test/arbitraries";
import { daysInMonth, isIsoDateString, parseIsoDate } from "@/utils/time";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

/** 周期→月数（テスト側の独立実装。実装側の対応表の写し間違いを検出するため別途定義する） */
const EXPECTED_MONTHS: Record<Cycle, number> = {
  [CYCLE.M1]: 1,
  [CYCLE.M3]: 3,
  [CYCLE.M6]: 6,
  [CYCLE.Y1]: 12,
  [CYCLE.Y2]: 24,
  [CYCLE.Y3]: 36,
  [CYCLE.Y5]: 60,
  [CYCLE.Y10]: 120,
};

/** 周期の短い順（単調性の検証に使用） */
const CYCLES_ASCENDING: Cycle[] = [
  CYCLE.M1,
  CYCLE.M3,
  CYCLE.M6,
  CYCLE.Y1,
  CYCLE.Y2,
  CYCLE.Y3,
  CYCLE.Y5,
  CYCLE.Y10,
];

describe("addCycle（property）", () => {
  it("結果は常に暦上妥当な YYYY-MM-DD である", () => {
    fc.assert(
      fc.property(isoDateArb, cycleArb, (isoDate, cycle) => {
        const result = addCycle(isoDate, cycle);
        expect(result).not.toBeNull();
        expect(isIsoDateString(result ?? "")).toBe(true);
      }),
    );
  });

  it("nextDueDate は常に lastDoneDate より後である（周期は正のため）", () => {
    fc.assert(
      fc.property(isoDateArb, cycleArb, (isoDate, cycle) => {
        const result = addCycle(isoDate, cycle);
        // ISO日付文字列は辞書順比較が日付順比較と一致する
        expect(result !== null && result > isoDate).toBe(true);
      }),
    );
  });

  it("年月は正確に周期分進む（月末補正は日にのみ作用し年月にはみ出さない）", () => {
    fc.assert(
      fc.property(isoDateArb, cycleArb, (isoDate, cycle) => {
        const source = parseIsoDate(isoDate);
        const result = parseIsoDate(addCycle(isoDate, cycle) ?? "");
        expect(source).not.toBeNull();
        expect(result).not.toBeNull();
        if (!source || !result) return;
        const sourceTotalMonths = source.year * 12 + (source.month - 1);
        const resultTotalMonths = result.year * 12 + (result.month - 1);
        expect(resultTotalMonths - sourceTotalMonths).toBe(EXPECTED_MONTHS[cycle]);
      }),
    );
  });

  it("日は「元の日」と「加算先の月末」の小さい方になる（月末補正の仕様そのもの）", () => {
    fc.assert(
      fc.property(isoDateArb, cycleArb, (isoDate, cycle) => {
        const source = parseIsoDate(isoDate);
        const result = parseIsoDate(addCycle(isoDate, cycle) ?? "");
        if (!source || !result) return;
        expect(result.day).toBe(Math.min(source.day, daysInMonth(result.year, result.month)));
      }),
    );
  });

  it("28日以前の日は補正されず常に維持される", () => {
    const dayAtMost28Arb = isoDateArb.filter((isoDate) => {
      const parsed = parseIsoDate(isoDate);
      return parsed !== null && parsed.day <= 28;
    });
    fc.assert(
      fc.property(dayAtMost28Arb, cycleArb, (isoDate, cycle) => {
        const source = parseIsoDate(isoDate);
        const result = parseIsoDate(addCycle(isoDate, cycle) ?? "");
        expect(result?.day).toBe(source?.day);
      }),
    );
  });

  it("周期が長いほど期限は同じか後になる（単調性）", () => {
    fc.assert(
      fc.property(isoDateArb, (isoDate) => {
        const dueDates = CYCLES_ASCENDING.map((cycle) => addCycle(isoDate, cycle) ?? "");
        const sorted = dueDates.toSorted();
        expect(dueDates).toEqual(sorted);
      }),
    );
  });
});
