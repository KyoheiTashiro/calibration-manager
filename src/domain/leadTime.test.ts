import { recommendedOrderDate, resolveLeadTime } from "@/domain/leadTime";
import { EXECUTION } from "@/store/types";
import { describe, expect, it } from "vitest";

describe("resolveLeadTime", () => {
  it("inspectionItem.leadTimeDays が設定されていればそれを使う（vendor より優先）", () => {
    expect(resolveLeadTime({ leadTimeDays: 10 }, { standardLeadTimeDays: 30 })).toBe(10);
  });

  it("inspectionItem.leadTimeDays 未設定なら vendor.standardLeadTimeDays へフォールバックする", () => {
    expect(resolveLeadTime({}, { standardLeadTimeDays: 30 })).toBe(30);
  });

  it("inspectionItem.leadTimeDays が 0 でもフォールバックしない（0 は有効な納期）", () => {
    expect(resolveLeadTime({ leadTimeDays: 0 }, { standardLeadTimeDays: 30 })).toBe(0);
  });

  it("両方未設定なら null", () => {
    expect(resolveLeadTime({}, {})).toBeNull();
  });

  it("vendor が null（依頼先未設定・参照切れ）でも inspectionItem 側の納期があれば解決できる", () => {
    expect(resolveLeadTime({ leadTimeDays: 10 }, null)).toBe(10);
    expect(resolveLeadTime({}, null)).toBeNull();
  });
});

describe("recommendedOrderDate", () => {
  const externalInspectionItem = {
    execution: EXECUTION.EXTERNAL,
    leadTimeDays: 10,
    bufferDays: 14,
    nextDueDate: "2026-07-31",
  };

  it("発注推奨日 = nextDueDate − leadTime − bufferDays（domain-model.md §4.2）", () => {
    // 2026-07-31 − 10日 − 14日 = 2026-07-07
    expect(recommendedOrderDate(externalInspectionItem, null)).toBe("2026-07-07");
  });

  it("inspectionItem.leadTimeDays 未設定時は vendor.standardLeadTimeDays で逆算する", () => {
    const inspectionItem = { ...externalInspectionItem, leadTimeDays: undefined };
    expect(recommendedOrderDate(inspectionItem, { standardLeadTimeDays: 10 })).toBe("2026-07-07");
  });

  it("内部実施の項目は null（発注の概念がない）", () => {
    expect(
      recommendedOrderDate({ ...externalInspectionItem, execution: EXECUTION.INTERNAL }, null),
    ).toBeNull();
  });

  it("納期がどこからも解決できない場合は null", () => {
    expect(recommendedOrderDate({ ...externalInspectionItem, leadTimeDays: undefined }, null)).toBeNull();
    expect(recommendedOrderDate({ ...externalInspectionItem, leadTimeDays: undefined }, {})).toBeNull();
  });

  it("nextDueDate が不正な日付の場合は null（例外を投げない）", () => {
    expect(recommendedOrderDate({ ...externalInspectionItem, nextDueDate: "2026-02-30" }, null)).toBeNull();
  });
});
