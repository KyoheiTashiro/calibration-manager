import { recommendedOrderDate, resolveLeadTime } from "@/domain/leadTime";
import { EXECUTION } from "@/store/types";
import { describe, expect, it } from "vitest";

describe("resolveLeadTime", () => {
  it("item.leadTimeDays が設定されていればそれを使う（vendor より優先）", () => {
    expect(resolveLeadTime({ leadTimeDays: 10 }, { standardLeadTimeDays: 30 })).toBe(10);
  });

  it("item.leadTimeDays 未設定なら vendor.standardLeadTimeDays へフォールバックする", () => {
    expect(resolveLeadTime({}, { standardLeadTimeDays: 30 })).toBe(30);
  });

  it("item.leadTimeDays が 0 でもフォールバックしない（0 は有効な納期）", () => {
    expect(resolveLeadTime({ leadTimeDays: 0 }, { standardLeadTimeDays: 30 })).toBe(0);
  });

  it("両方未設定なら null", () => {
    expect(resolveLeadTime({}, {})).toBeNull();
  });

  it("vendor が null（依頼先未設定・参照切れ）でも item 側の納期があれば解決できる", () => {
    expect(resolveLeadTime({ leadTimeDays: 10 }, null)).toBe(10);
    expect(resolveLeadTime({}, null)).toBeNull();
  });
});

describe("recommendedOrderDate", () => {
  const externalItem = {
    execution: EXECUTION.EXTERNAL,
    leadTimeDays: 10,
    bufferDays: 14,
    nextDueDate: "2026-07-31",
  };

  it("発注推奨日 = nextDueDate − leadTime − bufferDays（domain-model.md §4.2）", () => {
    // 2026-07-31 − 10日 − 14日 = 2026-07-07
    expect(recommendedOrderDate(externalItem, null)).toBe("2026-07-07");
  });

  it("item.leadTimeDays 未設定時は vendor.standardLeadTimeDays で逆算する", () => {
    const item = { ...externalItem, leadTimeDays: undefined };
    expect(recommendedOrderDate(item, { standardLeadTimeDays: 10 })).toBe("2026-07-07");
  });

  it("内部実施の項目は null（発注の概念がない）", () => {
    expect(
      recommendedOrderDate({ ...externalItem, execution: EXECUTION.INTERNAL }, null),
    ).toBeNull();
  });

  it("納期がどこからも解決できない場合は null", () => {
    expect(recommendedOrderDate({ ...externalItem, leadTimeDays: undefined }, null)).toBeNull();
    expect(recommendedOrderDate({ ...externalItem, leadTimeDays: undefined }, {})).toBeNull();
  });

  it("nextDueDate が不正な日付の場合は null（例外を投げない）", () => {
    expect(recommendedOrderDate({ ...externalItem, nextDueDate: "2026-02-30" }, null)).toBeNull();
  });
});
