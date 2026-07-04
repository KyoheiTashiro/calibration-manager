import { deriveServiceItemStatus, SERVICE_ITEM_STATUS } from "@/domain/serviceItemStatus";
import {
  type ServiceOrder,
  EXECUTION,
  type ServiceItem,
  SERVICE_ITEM_TYPE,
  ORDER_STATUS,
  type OrderStatus,
} from "@/store/types";
import { describe, expect, it } from "vitest";

/**
 * テスト用の外部実施項目。
 * nextDueDate 2026-07-31 / noticeDaysBefore 30 → dueSoon 開始日 2026-07-01
 * leadTimeDays 10 + bufferDays 14 → 発注推奨日 2026-07-07
 */
const buildServiceItem = (overrides: Partial<ServiceItem> = {}): ServiceItem => ({
  id: "item-1",
  equipmentId: "equipment-1",
  type: SERVICE_ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: "1Y",
  execution: EXECUTION.EXTERNAL,
  vendorId: "vendor-1",
  leadTimeDays: 10,
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate: "2026-07-31",
  isActive: true,
  ...overrides,
});

const buildOrder = (status: OrderStatus, serviceItemId = "item-1"): ServiceOrder => ({
  id: `order-${status}`,
  serviceItemId,
  vendorId: "vendor-1",
  status,
});

describe("deriveServiceItemStatus（優先度: overdue > orderNow > inProgress > dueSoon > ok）", () => {
  it("今日 > nextDueDate なら overdue", () => {
    expect(deriveServiceItemStatus(buildServiceItem(), [], null, "2026-08-01")).toBe(
      SERVICE_ITEM_STATUS.OVERDUE,
    );
  });

  it("今日 = nextDueDate は overdue ではない（厳密な超過のみ）", () => {
    expect(deriveServiceItemStatus(buildServiceItem(), [], null, "2026-07-31")).not.toBe(
      SERVICE_ITEM_STATUS.OVERDUE,
    );
  });

  it("優先度の逆転がない: overdue かつ orderNow の条件を両方満たす場合は overdue が勝つ", () => {
    // 期限超過済み・外部・案件なし → orderNow の条件（今日 ≥ 発注推奨日・有効案件なし）も満たすが overdue
    expect(deriveServiceItemStatus(buildServiceItem(), [], null, "2026-09-01")).toBe(
      SERVICE_ITEM_STATUS.OVERDUE,
    );
  });

  it("外部・今日 ≥ 発注推奨日・有効案件なしなら orderNow（境界: 推奨日当日）", () => {
    expect(deriveServiceItemStatus(buildServiceItem(), [], null, "2026-07-07")).toBe(
      SERVICE_ITEM_STATUS.ORDER_NOW,
    );
  });

  it("発注推奨日の前日は orderNow にならない（この例では dueSoon 窓にも入っていない）", () => {
    // 2026-07-06 は推奨日(07-07)前かつ dueSoon 開始日(07-01)後 → dueSoon
    expect(deriveServiceItemStatus(buildServiceItem(), [], null, "2026-07-06")).toBe(
      SERVICE_ITEM_STATUS.DUE_SOON,
    );
  });

  it("orderNow は有効な案件（planned 含む）があると成立しない", () => {
    const planned = [buildOrder(ORDER_STATUS.PLANNED)];
    // planned は inProgress の対象でもないため dueSoon 窓内なら dueSoon まで落ちる
    expect(deriveServiceItemStatus(buildServiceItem(), planned, null, "2026-07-07")).toBe(
      SERVICE_ITEM_STATUS.DUE_SOON,
    );
  });

  it("completed / cancelled の案件は「有効な案件」ではないので orderNow が成立する", () => {
    const finished = [buildOrder(ORDER_STATUS.COMPLETED), buildOrder(ORDER_STATUS.CANCELLED)];
    expect(deriveServiceItemStatus(buildServiceItem(), finished, null, "2026-07-07")).toBe(
      SERVICE_ITEM_STATUS.ORDER_NOW,
    );
  });

  it("外部・ordered の案件があれば inProgress", () => {
    const orders = [buildOrder(ORDER_STATUS.ORDERED)];
    expect(deriveServiceItemStatus(buildServiceItem(), orders, null, "2026-07-07")).toBe(
      SERVICE_ITEM_STATUS.IN_PROGRESS,
    );
  });

  it("外部・inCalibration の案件があれば inProgress", () => {
    const orders = [buildOrder(ORDER_STATUS.IN_CALIBRATION)];
    expect(deriveServiceItemStatus(buildServiceItem(), orders, null, "2026-07-07")).toBe(
      SERVICE_ITEM_STATUS.IN_PROGRESS,
    );
  });

  it("他項目の案件は判定に影響しない（serviceItemId で絞り込む）", () => {
    const otherServiceItemOrders = [buildOrder(ORDER_STATUS.ORDERED, "item-other")];
    expect(
      deriveServiceItemStatus(
        buildServiceItem(),
        otherServiceItemOrders,
        null,
        "2026-07-07",
      ),
    ).toBe(SERVICE_ITEM_STATUS.ORDER_NOW);
  });

  it("今日 ≥ nextDueDate − noticeDaysBefore なら dueSoon（境界: 開始日当日）", () => {
    const internalServiceItem = buildServiceItem({
      execution: EXECUTION.INTERNAL,
      vendorId: undefined,
    });
    expect(deriveServiceItemStatus(internalServiceItem, [], null, "2026-07-01")).toBe(
      SERVICE_ITEM_STATUS.DUE_SOON,
    );
  });

  it("期限当日は dueSoon（overdue ではない）", () => {
    const internalServiceItem = buildServiceItem({
      execution: EXECUTION.INTERNAL,
      vendorId: undefined,
    });
    expect(deriveServiceItemStatus(internalServiceItem, [], null, "2026-07-31")).toBe(
      SERVICE_ITEM_STATUS.DUE_SOON,
    );
  });

  it("dueSoon 開始日の前日は ok", () => {
    const internalServiceItem = buildServiceItem({
      execution: EXECUTION.INTERNAL,
      vendorId: undefined,
    });
    expect(deriveServiceItemStatus(internalServiceItem, [], null, "2026-06-30")).toBe(
      SERVICE_ITEM_STATUS.OK,
    );
  });

  it("内部実施は orderNow / inProgress にならない（発注の概念がない）", () => {
    const internalServiceItem = buildServiceItem({
      execution: EXECUTION.INTERNAL,
      vendorId: undefined,
    });
    const orders = [buildOrder(ORDER_STATUS.ORDERED)];
    expect(deriveServiceItemStatus(internalServiceItem, orders, null, "2026-07-07")).toBe(
      SERVICE_ITEM_STATUS.DUE_SOON,
    );
  });

  it("serviceItem に納期が無くても vendor の標準納期で orderNow を判定できる（フォールバック）", () => {
    const serviceItem = buildServiceItem({ leadTimeDays: undefined });
    expect(
      deriveServiceItemStatus(serviceItem, [], { standardLeadTimeDays: 10 }, "2026-07-07"),
    ).toBe(SERVICE_ITEM_STATUS.ORDER_NOW);
  });

  it("納期がどこからも解決できない外部項目は orderNow にならない（推奨日を計算できない）", () => {
    const serviceItem = buildServiceItem({ leadTimeDays: undefined });
    expect(deriveServiceItemStatus(serviceItem, [], null, "2026-07-07")).toBe(
      SERVICE_ITEM_STATUS.DUE_SOON,
    );
  });
});
