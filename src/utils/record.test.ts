import { recordValue } from "@/utils/record";
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
