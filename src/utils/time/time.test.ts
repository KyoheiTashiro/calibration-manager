import {
  addDays,
  daysInMonth,
  formatIsoDate,
  isIsoDateString,
  parseIsoDate,
  todayIsoDate,
} from "@/utils/time";
import { describe, expect, it } from "vitest";

describe("daysInMonth", () => {
  it("平年の2月は28日", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it("閏年の2月は29日", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it("400の倍数の世紀年（2000年）は閏年", () => {
    expect(daysInMonth(2000, 2)).toBe(29);
  });

  it("100の倍数だが400の倍数でない世紀年（2100年）は平年", () => {
    expect(daysInMonth(2100, 2)).toBe(28);
  });

  it("31日の月と30日の月を区別する", () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
  });
});

describe("parseIsoDate", () => {
  it("妥当な日付を年月日に分解する", () => {
    expect(parseIsoDate("2026-07-03")).toEqual({ year: 2026, month: 7, day: 3 });
  });

  it("暦上あり得ない日付（2026-02-30）は null", () => {
    expect(parseIsoDate("2026-02-30")).toBeNull();
  });

  it("閏日（2024-02-29）は妥当", () => {
    expect(parseIsoDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it("平年の2月29日は null", () => {
    expect(parseIsoDate("2026-02-29")).toBeNull();
  });

  it("形式不正（スラッシュ区切り・文字列・空文字）は null", () => {
    expect(parseIsoDate("2026/07/03")).toBeNull();
    expect(parseIsoDate("not-a-date")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
  });

  it("月0・月13・日0は null", () => {
    expect(parseIsoDate("2026-00-15")).toBeNull();
    expect(parseIsoDate("2026-13-15")).toBeNull();
    expect(parseIsoDate("2026-07-00")).toBeNull();
  });
});

describe("isIsoDateString", () => {
  it("妥当な日付は true、不正は false", () => {
    expect(isIsoDateString("2026-07-03")).toBe(true);
    expect(isIsoDateString("2026-02-30")).toBe(false);
  });
});

describe("formatIsoDate", () => {
  it("ゼロ埋めして YYYY-MM-DD の10桁固定で整形する", () => {
    expect(formatIsoDate({ year: 2026, month: 7, day: 3 })).toBe("2026-07-03");
  });
});

describe("addDays", () => {
  it("月をまたぐ加算ができる", () => {
    expect(addDays("2026-07-30", 5)).toBe("2026-08-04");
  });

  it("年をまたぐ減算ができる", () => {
    expect(addDays("2026-01-05", -10)).toBe("2025-12-26");
  });

  it("閏日をまたぐ加算ができる", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("0日加算は同じ日付を返す", () => {
    expect(addDays("2026-07-03", 0)).toBe("2026-07-03");
  });

  it("不正な日付は null（例外を投げない）", () => {
    expect(addDays("2026-02-30", 1)).toBeNull();
  });
});

describe("todayIsoDate", () => {
  it("YYYY-MM-DD 形式の妥当な日付を返す", () => {
    expect(isIsoDateString(todayIsoDate())).toBe(true);
  });
});
