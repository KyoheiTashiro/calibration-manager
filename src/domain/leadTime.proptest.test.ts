import { recommendedOrderDate, resolveLeadTime } from "@/domain/leadTime";
import { EXECUTION } from "@/store/types";
import { dayCountArb, isoDateArb } from "@/test/arbitraries";
import { addDays } from "@/utils/time";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

/** 外部実施項目（発注推奨日の計算対象）を組み立てる */
const externalItemArb = fc.record({
  execution: fc.constant(EXECUTION.EXTERNAL),
  leadTimeDays: dayCountArb,
  bufferDays: dayCountArb,
  nextDueDate: isoDateArb,
});

describe("recommendedOrderDate（property）", () => {
  it("発注推奨日は nextDueDate から (leadTime + bufferDays) 日戻した日に一致する", () => {
    fc.assert(
      fc.property(externalItemArb, (item) => {
        expect(recommendedOrderDate(item, null)).toBe(
          addDays(item.nextDueDate, -(item.leadTimeDays + item.bufferDays)),
        );
      }),
    );
  });

  it("納期を長くするほど発注推奨日は同じか早まる（単調性）", () => {
    fc.assert(
      fc.property(externalItemArb, dayCountArb, (item, additionalDays) => {
        const base = recommendedOrderDate(item, null);
        const longer = recommendedOrderDate(
          { ...item, leadTimeDays: item.leadTimeDays + additionalDays },
          null,
        );
        expect(base).not.toBeNull();
        expect(longer).not.toBeNull();
        expect(longer !== null && base !== null && longer <= base).toBe(true);
      }),
    );
  });

  it("item.leadTimeDays=n と「未設定 + vendor標準納期=n」は同じ結果になる（フォールバック等価性）", () => {
    fc.assert(
      fc.property(externalItemArb, (item) => {
        const viaItem = recommendedOrderDate(item, null);
        const viaVendor = recommendedOrderDate(
          { ...item, leadTimeDays: undefined },
          { standardLeadTimeDays: item.leadTimeDays },
        );
        expect(viaVendor).toBe(viaItem);
      }),
    );
  });

  it("resolveLeadTime は item 優先・vendor フォールバック・両方無しで null の3値のみ", () => {
    fc.assert(
      fc.property(
        fc.option(dayCountArb, { nil: undefined }),
        fc.option(dayCountArb, { nil: undefined }),
        (itemDays, vendorDays) => {
          const resolved = resolveLeadTime(
            { leadTimeDays: itemDays },
            { standardLeadTimeDays: vendorDays },
          );
          expect(resolved).toBe(itemDays ?? vendorDays ?? null);
        },
      ),
    );
  });
});
