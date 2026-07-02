import { addCycle } from "@/domain/dateCycle";
import { CYCLE } from "@/store/types";
import { describe, expect, it } from "vitest";

describe("addCycle（例示ベース）", () => {
  it("月末補正: 1/31 + 1M → 2/28（domain-model.md §4.1 の例）", () => {
    expect(addCycle("2026-01-31", CYCLE.M1)).toBe("2026-02-28");
  });

  it("月末補正: 閏年は 1/31 + 1M → 2/29", () => {
    expect(addCycle("2024-01-31", CYCLE.M1)).toBe("2024-02-29");
  });

  it("月末補正: 3/31 + 3M → 6/30（30日月への繰り上がり調整）", () => {
    expect(addCycle("2026-03-31", CYCLE.M3)).toBe("2026-06-30");
  });

  it("月末補正: 8/31 + 6M → 翌年2/28（年またぎ + 2月調整）", () => {
    expect(addCycle("2026-08-31", CYCLE.M6)).toBe("2027-02-28");
  });

  it("月末補正: 閏日起点の 2024-02-29 + 1Y → 2025-02-28", () => {
    expect(addCycle("2024-02-29", CYCLE.Y1)).toBe("2025-02-28");
  });

  it("補正が不要な日はそのまま維持される（全周期網羅）", () => {
    expect(addCycle("2026-01-15", CYCLE.M1)).toBe("2026-02-15");
    expect(addCycle("2026-01-15", CYCLE.M3)).toBe("2026-04-15");
    expect(addCycle("2026-01-15", CYCLE.M6)).toBe("2026-07-15");
    expect(addCycle("2026-01-15", CYCLE.Y1)).toBe("2027-01-15");
    expect(addCycle("2026-01-15", CYCLE.Y2)).toBe("2028-01-15");
    expect(addCycle("2026-01-15", CYCLE.Y3)).toBe("2029-01-15");
    expect(addCycle("2026-01-15", CYCLE.Y5)).toBe("2031-01-15");
    expect(addCycle("2026-01-15", CYCLE.Y10)).toBe("2036-01-15");
  });

  it("月加算の年またぎ: 11/15 + 3M → 翌年2/15", () => {
    expect(addCycle("2026-11-15", CYCLE.M3)).toBe("2027-02-15");
  });

  it("12月起点でも正しく翌年へ繰り上がる", () => {
    expect(addCycle("2026-12-31", CYCLE.M1)).toBe("2027-01-31");
  });

  it("不正な日付は null（例外を投げない）", () => {
    expect(addCycle("2026-02-30", CYCLE.M1)).toBeNull();
    expect(addCycle("not-a-date", CYCLE.Y1)).toBeNull();
  });
});
