import { deriveItemStatus, ITEM_STATUS } from "@/domain/itemStatus";
import { EXECUTION } from "@/store/types";
import { calibrationOrderArb, inspectionItemArb, isoDateArb, vendorArb } from "@/test/arbitraries";
import { addDays } from "@/utils/time";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

const ordersArb = fc.array(calibrationOrderArb, { maxLength: 5 });
const vendorOrNullArb = fc.option(vendorArb, { nil: null });

describe("deriveItemStatus（property）", () => {
  it("結果は常に5ステータスのいずれかである", () => {
    fc.assert(
      fc.property(
        inspectionItemArb,
        ordersArb,
        vendorOrNullArb,
        isoDateArb,
        (item, orders, vendor, today) => {
          const status = deriveItemStatus(item, orders, vendor, today);
          expect(Object.values(ITEM_STATUS)).toContain(status);
        },
      ),
    );
  });

  it("今日 > nextDueDate なら案件・納期の状況によらず必ず overdue（最優先の不変条件）", () => {
    fc.assert(
      fc.property(
        inspectionItemArb,
        ordersArb,
        vendorOrNullArb,
        isoDateArb,
        (item, orders, vendor, today) => {
          fc.pre(today > item.nextDueDate);
          expect(deriveItemStatus(item, orders, vendor, today)).toBe(ITEM_STATUS.OVERDUE);
        },
      ),
    );
  });

  it("内部実施の項目は決して orderNow / inProgress にならない", () => {
    fc.assert(
      fc.property(
        inspectionItemArb,
        ordersArb,
        vendorOrNullArb,
        isoDateArb,
        (item, orders, vendor, today) => {
          const internalItem = { ...item, execution: EXECUTION.INTERNAL };
          const status = deriveItemStatus(internalItem, orders, vendor, today);
          expect(status).not.toBe(ITEM_STATUS.ORDER_NOW);
          expect(status).not.toBe(ITEM_STATUS.IN_PROGRESS);
        },
      ),
    );
  });

  it("内部・期限内・案件なしの項目は、通知窓の内なら dueSoon / 外なら ok に二分される", () => {
    fc.assert(
      fc.property(inspectionItemArb, isoDateArb, (item, today) => {
        const internalItem = { ...item, execution: EXECUTION.INTERNAL };
        fc.pre(today <= internalItem.nextDueDate);
        const windowStart = addDays(internalItem.nextDueDate, -internalItem.noticeDaysBefore);
        const expected =
          windowStart !== null && today >= windowStart ? ITEM_STATUS.DUE_SOON : ITEM_STATUS.OK;
        expect(deriveItemStatus(internalItem, [], null, today)).toBe(expected);
      }),
    );
  });
});
