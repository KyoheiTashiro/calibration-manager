import { deriveInspectionItemStatus, INSPECTION_ITEM_STATUS } from "@/domain/inspectionItemStatus";
import { EXECUTION } from "@/store/types";
import { calibrationOrderArb, inspectionItemArb, isoDateArb, vendorArb } from "@/test/arbitraries";
import { addDays } from "@/utils/time";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

const ordersArb = fc.array(calibrationOrderArb, { maxLength: 5 });
const vendorOrNullArb = fc.option(vendorArb, { nil: null });

describe("deriveInspectionItemStatus（property）", () => {
  it("結果は常に5ステータスのいずれかである", () => {
    fc.assert(
      fc.property(
        inspectionItemArb,
        ordersArb,
        vendorOrNullArb,
        isoDateArb,
        (inspectionItem, orders, vendor, today) => {
          const status = deriveInspectionItemStatus(inspectionItem, orders, vendor, today);
          expect(Object.values(INSPECTION_ITEM_STATUS)).toContain(status);
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
        (inspectionItem, orders, vendor, today) => {
          fc.pre(today > inspectionItem.nextDueDate);
          expect(deriveInspectionItemStatus(inspectionItem, orders, vendor, today)).toBe(INSPECTION_ITEM_STATUS.OVERDUE);
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
        (inspectionItem, orders, vendor, today) => {
          const internalInspectionItem = { ...inspectionItem, execution: EXECUTION.INTERNAL };
          const status = deriveInspectionItemStatus(internalInspectionItem, orders, vendor, today);
          expect(status).not.toBe(INSPECTION_ITEM_STATUS.ORDER_NOW);
          expect(status).not.toBe(INSPECTION_ITEM_STATUS.IN_PROGRESS);
        },
      ),
    );
  });

  it("内部・期限内・案件なしの項目は、通知窓の内なら dueSoon / 外なら ok に二分される", () => {
    fc.assert(
      fc.property(inspectionItemArb, isoDateArb, (inspectionItem, today) => {
        const internalInspectionItem = { ...inspectionItem, execution: EXECUTION.INTERNAL };
        fc.pre(today <= internalInspectionItem.nextDueDate);
        const windowStart = addDays(internalInspectionItem.nextDueDate, -internalInspectionItem.noticeDaysBefore);
        const expected =
          windowStart !== null && today >= windowStart ? INSPECTION_ITEM_STATUS.DUE_SOON : INSPECTION_ITEM_STATUS.OK;
        expect(deriveInspectionItemStatus(internalInspectionItem, [], null, today)).toBe(expected);
      }),
    );
  });
});
