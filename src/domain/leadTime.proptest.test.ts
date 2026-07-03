import { recommendedOrderDate, resolveLeadTime } from "@/domain/leadTime";
import { EXECUTION } from "@/store/types";
import { dayCountArb, isoDateArb } from "@/test/arbitraries";
import { addDays } from "@/utils/time";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

/** 外部実施項目（発注推奨日の計算対象）を組み立てる */
const externalInspectionItemArb = fc.record({
  execution: fc.constant(EXECUTION.EXTERNAL),
  leadTimeDays: dayCountArb,
  bufferDays: dayCountArb,
  nextDueDate: isoDateArb,
});

describe("recommendedOrderDate（property）", () => {
  it("発注推奨日は nextDueDate から (leadTime + bufferDays) 日戻した日に一致する", () => {
    fc.assert(
      fc.property(externalInspectionItemArb, (inspectionItem) => {
        expect(recommendedOrderDate(inspectionItem, null)).toBe(
          addDays(inspectionItem.nextDueDate, -(inspectionItem.leadTimeDays + inspectionItem.bufferDays)),
        );
      }),
    );
  });

  it("納期を長くするほど発注推奨日は同じか早まる（単調性）", () => {
    fc.assert(
      fc.property(externalInspectionItemArb, dayCountArb, (inspectionItem, additionalDays) => {
        const base = recommendedOrderDate(inspectionItem, null);
        const longer = recommendedOrderDate(
          { ...inspectionItem, leadTimeDays: inspectionItem.leadTimeDays + additionalDays },
          null,
        );
        expect(base).not.toBeNull();
        expect(longer).not.toBeNull();
        expect(longer !== null && base !== null && longer <= base).toBe(true);
      }),
    );
  });

  it("inspectionItem.leadTimeDays=n と「未設定 + vendor標準納期=n」は同じ結果になる（フォールバック等価性）", () => {
    fc.assert(
      fc.property(externalInspectionItemArb, (inspectionItem) => {
        const viaInspectionItem = recommendedOrderDate(inspectionItem, null);
        const viaVendor = recommendedOrderDate(
          { ...inspectionItem, leadTimeDays: undefined },
          { standardLeadTimeDays: inspectionItem.leadTimeDays },
        );
        expect(viaVendor).toBe(viaInspectionItem);
      }),
    );
  });

  it("resolveLeadTime は inspectionItem 優先・vendor フォールバック・両方無しで null の3値のみ", () => {
    fc.assert(
      fc.property(
        fc.option(dayCountArb, { nil: undefined }),
        fc.option(dayCountArb, { nil: undefined }),
        (inspectionItemDays, vendorDays) => {
          const resolved = resolveLeadTime(
            { leadTimeDays: inspectionItemDays },
            { standardLeadTimeDays: vendorDays },
          );
          expect(resolved).toBe(inspectionItemDays ?? vendorDays ?? null);
        },
      ),
    );
  });
});
