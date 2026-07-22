/**
 * 返却ダイアログ用フォームスキーマの検証(screen-design/08-service-orders.md)。
 * 画面経由の検証は board.test.tsx / integration.test.tsx が担い、ここでは
 * 実返却日の必須・YYYY-MM-DD 形式の境界値をスキーマ単体で固定する。
 */

import { Schema } from "@/features/serviceOrder/returnDialog/schema";
import { describe, expect, it } from "vitest";

describe("Schema", () => {
  it("実返却日は必須かつ YYYY-MM-DD", () => {
    expect(Schema.safeParse({ returnedDate: "2026-07-01" }).success).toBe(true);
    expect(Schema.safeParse({ returnedDate: "" }).success).toBe(false);
    expect(Schema.safeParse({ returnedDate: "2026/07/01" }).success).toBe(false);
  });
});
