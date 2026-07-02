import { createId } from "@/utils/id";
import { describe, expect, it } from "vitest";

describe("createId", () => {
  it("uuid 形式の文字列を返す", () => {
    expect(createId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u);
  });

  it("呼び出しごとに異なるIDを返す", () => {
    expect(createId()).not.toBe(createId());
  });
});
