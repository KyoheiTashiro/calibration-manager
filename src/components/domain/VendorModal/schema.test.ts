import { defaultValues, Schema } from "@/components/domain/VendorModal/schema";
import { TEXT_LIMIT } from "@/constants/textLimits";
import { maxLengthMessage } from "@/utils/form";
import { describe, expect, it } from "vitest";

const validBase = { ...defaultValues, name: "ミツトヨ商事" };

describe("Schema: 文字数上限バリデーション", () => {
  it("nameが50文字ちょうどなら通る", () => {
    const result = Schema.safeParse({ ...validBase, name: "あ".repeat(TEXT_LIMIT.name) });

    expect(result.success).toBe(true);
  });

  it("nameが51文字だとエラーになる", () => {
    const result = Schema.safeParse({ ...validBase, name: "あ".repeat(TEXT_LIMIT.name + 1) });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(maxLengthMessage("名称", TEXT_LIMIT.name));
    }
  });

  it("contactPersonが50文字ちょうどなら通る", () => {
    const result = Schema.safeParse({
      ...validBase,
      contactPerson: "あ".repeat(TEXT_LIMIT.name),
    });

    expect(result.success).toBe(true);
  });

  it("contactPersonが51文字だとエラーになる", () => {
    const result = Schema.safeParse({
      ...validBase,
      contactPerson: "あ".repeat(TEXT_LIMIT.name + 1),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(maxLengthMessage("窓口担当者", TEXT_LIMIT.name));
    }
  });

  it("emailが254文字ちょうどなら通る", () => {
    const local = "a".repeat(TEXT_LIMIT.email - "@example.com".length);
    const email = `${local}@example.com`;
    const result = Schema.safeParse({ ...validBase, email });

    expect(email.length).toBe(TEXT_LIMIT.email);
    expect(result.success).toBe(true);
  });

  it("emailが255文字だとエラーになる", () => {
    const local = "a".repeat(TEXT_LIMIT.email - "@example.com".length + 1);
    const email = `${local}@example.com`;
    const result = Schema.safeParse({ ...validBase, email });

    expect(email.length).toBe(TEXT_LIMIT.email + 1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        maxLengthMessage("メールアドレス", TEXT_LIMIT.email),
      );
    }
  });

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

describe("Schema: phoneの形式バリデーション", () => {
  it("半角数字とハイフンのみなら通る", () => {
    const result = Schema.safeParse({ ...validBase, phone: "03-1234-5678" });

    expect(result.success).toBe(true);
  });

  it("空文字なら通る", () => {
    const result = Schema.safeParse({ ...validBase, phone: "" });

    expect(result.success).toBe(true);
  });

  it("カッコを含むとエラーになる", () => {
    const result = Schema.safeParse({ ...validBase, phone: "03(1234)5678" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "電話番号は半角数字またはハイフンで入力してください",
      );
    }
  });

  it("全角文字を含むとエラーになる", () => {
    const result = Schema.safeParse({ ...validBase, phone: "０３−１２３４" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "電話番号は半角数字またはハイフンで入力してください",
      );
    }
  });
});
