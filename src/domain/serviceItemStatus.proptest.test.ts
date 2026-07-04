import { deriveServiceItemStatus, SERVICE_ITEM_STATUS } from "@/domain/serviceItemStatus";
import { EXECUTION } from "@/store/types";
import { serviceOrderArb, serviceItemArb, isoDateArb, vendorArb } from "@/test/arbitraries";
import { addDays } from "@/utils/time";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

const ordersArb = fc.array(serviceOrderArb, { maxLength: 5 });
const vendorOrNullArb = fc.option(vendorArb, { nil: null });

describe("deriveServiceItemStatus（property）", () => {
  it("結果は常に5ステータスのいずれかである", () => {
    fc.assert(
      fc.property(
        serviceItemArb,
        ordersArb,
        vendorOrNullArb,
        isoDateArb,
        (serviceItem, orders, vendor, today) => {
          const status = deriveServiceItemStatus(serviceItem, orders, vendor, today);
          expect(Object.values(SERVICE_ITEM_STATUS)).toContain(status);
        },
      ),
    );
  });

  it("今日 > nextDueDate なら案件・納期の状況によらず必ず overdue（最優先の不変条件）", () => {
    fc.assert(
      fc.property(
        serviceItemArb,
        ordersArb,
        vendorOrNullArb,
        isoDateArb,
        (serviceItem, orders, vendor, today) => {
          fc.pre(today > serviceItem.nextDueDate);
          expect(deriveServiceItemStatus(serviceItem, orders, vendor, today)).toBe(
            SERVICE_ITEM_STATUS.OVERDUE,
          );
        },
      ),
    );
  });

  it("内部実施の項目は決して orderNow / inProgress にならない", () => {
    fc.assert(
      fc.property(
        serviceItemArb,
        ordersArb,
        vendorOrNullArb,
        isoDateArb,
        (serviceItem, orders, vendor, today) => {
          const internalServiceItem = { ...serviceItem, execution: EXECUTION.INTERNAL };
          const status = deriveServiceItemStatus(internalServiceItem, orders, vendor, today);
          expect(status).not.toBe(SERVICE_ITEM_STATUS.ORDER_NOW);
          expect(status).not.toBe(SERVICE_ITEM_STATUS.IN_PROGRESS);
        },
      ),
    );
  });

  it("内部・期限内・案件なしの項目は、通知窓の内なら dueSoon / 外なら ok に二分される", () => {
    fc.assert(
      fc.property(serviceItemArb, isoDateArb, (serviceItem, today) => {
        const internalServiceItem = { ...serviceItem, execution: EXECUTION.INTERNAL };
        fc.pre(today <= internalServiceItem.nextDueDate);
        const windowStart = addDays(
          internalServiceItem.nextDueDate,
          -internalServiceItem.noticeDaysBefore,
        );
        const expected =
          windowStart !== null && today >= windowStart
            ? SERVICE_ITEM_STATUS.DUE_SOON
            : SERVICE_ITEM_STATUS.OK;
        expect(deriveServiceItemStatus(internalServiceItem, [], null, today)).toBe(expected);
      }),
    );
  });
});
