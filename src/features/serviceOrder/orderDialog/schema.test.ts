/**
 * 発注ダイアログ用フォームスキーマの検証(screen-design/08-service-orders.md、D-021)。
 * 画面経由の検証は board.test.tsx / integration.test.tsx が担い、ここでは
 * 費用の整数粒度(D-021)等、境界値をスキーマ単体で固定する。
 */

import { Schema } from "@/features/serviceOrder/orderDialog/schema";
import { describe, expect, it } from "vitest";

describe("Schema", () => {
  const base = { orderedDate: "2026-07-01", dueDate: "", cost: "" };

  it("発注日必須・任意項目空欄で通る", () => {
    expect(Schema.safeParse(base).success).toBe(true);
  });

  it.each(["", "12000", "0"])("費用 %s は通る", (cost) => {
    expect(Schema.safeParse({ ...base, cost }).success).toBe(true);
  });

  it.each(["1.5", "-1", "abc"])("費用 %s は整数粒度違反で弾く(D-021)", (cost) => {
    expect(Schema.safeParse({ ...base, cost }).success).toBe(false);
  });

  it("発注日が空・形式不正なら弾く", () => {
    expect(Schema.safeParse({ ...base, orderedDate: "" }).success).toBe(false);
    expect(Schema.safeParse({ ...base, orderedDate: "2026-02-30" }).success).toBe(false);
  });
});
