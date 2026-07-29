import { defaultValues, Schema } from "@/components/domain/PersonModal/schema";
import { TEXT_LIMIT } from "@/constants/textLimits";
import { maxLengthMessage } from "@/utils/form";
import { describe, expect, it } from "vitest";

const validBase = { ...defaultValues, name: "山田太郎", email: "yamada@example.com" };

describe("Schema: 文字数上限バリデーション", () => {
  it("nameが50文字ちょうどなら通る", () => {
    const result = Schema.safeParse({ ...validBase, name: "あ".repeat(TEXT_LIMIT.name) });

    expect(result.success).toBe(true);
  });

  it("nameが51文字だとエラーになる", () => {
    const result = Schema.safeParse({ ...validBase, name: "あ".repeat(TEXT_LIMIT.name + 1) });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(maxLengthMessage("氏名", TEXT_LIMIT.name));
    }
  });

  it("departmentが50文字ちょうどなら通る", () => {
    const result = Schema.safeParse({
      ...validBase,
      department: "あ".repeat(TEXT_LIMIT.name),
    });

    expect(result.success).toBe(true);
  });

  it("departmentが51文字だとエラーになる", () => {
    const result = Schema.safeParse({
      ...validBase,
      department: "あ".repeat(TEXT_LIMIT.name + 1),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(maxLengthMessage("部署", TEXT_LIMIT.name));
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
});
