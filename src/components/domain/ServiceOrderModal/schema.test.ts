import { defaultValues, Schema } from "@/components/domain/ServiceOrderModal/schema";
import { TEXT_LIMIT } from "@/constants/textLimits";
import { maxLengthMessage } from "@/utils/form";
import { describe, expect, it } from "vitest";

const validBase = { ...defaultValues, vendorId: "vendor-1" };

describe("Schema: 文字数上限バリデーション", () => {
  it("noteが500文字ちょうどなら通る", () => {
    const result = Schema.safeParse({ ...validBase, note: "あ".repeat(TEXT_LIMIT.note) });

    expect(result.success).toBe(true);
  });

  it("noteが501文字だとエラーになる", () => {
    const result = Schema.safeParse({ ...validBase, note: "あ".repeat(TEXT_LIMIT.note + 1) });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(maxLengthMessage("備考", TEXT_LIMIT.note));
    }
  });
});
