import { isRecord, recordValue } from "@/utils/record";
import { describe, expect, it } from "vitest";

describe("recordValue", () => {
  it("存在するキーの値を返す", () => {
    expect(recordValue({ key: 1 }, "key")).toBe(1);
  });

  it("存在しないキーは undefined を返す", () => {
    expect(recordValue<number>({}, "missing")).toBeUndefined();
  });

  it("プロトタイプ上のプロパティ名（constructor等）を自身のキーと誤認しない", () => {
    expect(recordValue<number>({}, "constructor")).toBeUndefined();
  });
});

describe("isRecord", () => {
  it("プレーンオブジェクトは true", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ key: "value" })).toBe(true);
  });

  it("配列も object 型のため true", () => {
    expect(isRecord([])).toBe(true);
  });

  it("null は false", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("プリミティブ値・undefined は false", () => {
    expect(isRecord("string")).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(true)).toBe(false);
    const values: unknown[] = [undefined];
    expect(isRecord(values[0])).toBe(false);
  });
});
