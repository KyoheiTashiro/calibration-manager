import { defaultValues, Schema } from "@/components/domain/ServiceItemModal/schema";
import { TEXT_LIMIT } from "@/constants/textLimits";
import { maxLengthMessage } from "@/utils/form";
import { describe, expect, it } from "vitest";

const validBase = {
  ...defaultValues,
  name: "外観点検",
  personId: "person-1",
  nextDueDate: "2026-01-01",
};

describe("Schema: 文字数上限バリデーション", () => {
  it("nameが50文字ちょうどなら通る", () => {
    const result = Schema.safeParse({ ...validBase, name: "あ".repeat(TEXT_LIMIT.name) });

    expect(result.success).toBe(true);
  });

  it("nameが51文字だとエラーになる", () => {
    const result = Schema.safeParse({ ...validBase, name: "あ".repeat(TEXT_LIMIT.name + 1) });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(maxLengthMessage("項目名", TEXT_LIMIT.name));
    }
  });
});
