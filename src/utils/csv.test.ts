import { CSV_BOM, parseCsv, serializeCsv } from "@/utils/csv";
import { describe, expect, it } from "vitest";

describe("serializeCsv", () => {
  it("カンマ・引用符・改行を含むセルのみ引用し、各行を CRLF で終端する", () => {
    expect(serializeCsv([["a", "b,c", 'd"e', "f\ng"]])).toBe('a,"b,c","d""e","f\ng"\r\n');
  });

  it("空のセルは空フィールドとして出力する", () => {
    expect(serializeCsv([["", "x", ""]])).toBe(",x,\r\n");
  });

  it("行なしは空文字列を返す", () => {
    expect(serializeCsv([])).toBe("");
  });
});

describe("parseCsv", () => {
  it("CRLF 区切りの複数行をパースする", () => {
    expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("LF のみの行末も受理する", () => {
    expect(parseCsv("a,b\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("先頭の BOM を除去する", () => {
    expect(parseCsv(`${CSV_BOM}a,b\r\n`)).toEqual([["a", "b"]]);
  });

  it("引用フィールド内のカンマ・改行・二重引用符を扱う", () => {
    expect(parseCsv('"a,b","c\r\nd","e""f"\r\n')).toEqual([["a,b", "c\r\nd", 'e"f']]);
  });

  it("末尾に改行がない最終行も1行として扱う", () => {
    expect(parseCsv("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("空文字列は空の配列を返す", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("閉じ引用が欠落した入力は null を返す", () => {
    expect(parseCsv('"abc')).toBeNull();
  });

  it("閉じ引用の直後に余分な文字がある入力は null を返す", () => {
    expect(parseCsv('"a"b,c\r\n')).toBeNull();
  });
});
