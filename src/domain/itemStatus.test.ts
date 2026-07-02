import { deriveItemStatus, ITEM_STATUS } from "@/domain/itemStatus";
import {
  type CalibrationOrder,
  EXECUTION,
  type InspectionItem,
  ITEM_TYPE,
  ORDER_STATUS,
  type OrderStatus,
} from "@/store/types";
import { describe, expect, it } from "vitest";

/**
 * テスト用の外部実施項目。
 * nextDueDate 2026-07-31 / noticeDaysBefore 30 → dueSoon 開始日 2026-07-01
 * leadTimeDays 10 + bufferDays 14 → 発注推奨日 2026-07-07
 */
const buildItem = (overrides: Partial<InspectionItem> = {}): InspectionItem => ({
  id: "item-1",
  equipmentId: "equipment-1",
  type: ITEM_TYPE.CALIBRATION,
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

const buildOrder = (status: OrderStatus, itemId = "item-1"): CalibrationOrder => ({
  id: `order-${status}`,
  itemId,
  vendorId: "vendor-1",
  status,
});

describe("deriveItemStatus（優先度: overdue > orderNow > inProgress > dueSoon > ok）", () => {
  it("今日 > nextDueDate なら overdue", () => {
    expect(deriveItemStatus(buildItem(), [], null, "2026-08-01")).toBe(ITEM_STATUS.OVERDUE);
  });

  it("今日 = nextDueDate は overdue ではない（厳密な超過のみ）", () => {
    expect(deriveItemStatus(buildItem(), [], null, "2026-07-31")).not.toBe(ITEM_STATUS.OVERDUE);
  });

  it("優先度の逆転がない: overdue かつ orderNow の条件を両方満たす場合は overdue が勝つ", () => {
    // 期限超過済み・外部・案件なし → orderNow の条件（今日 ≥ 発注推奨日・有効案件なし）も満たすが overdue
    expect(deriveItemStatus(buildItem(), [], null, "2026-09-01")).toBe(ITEM_STATUS.OVERDUE);
  });

  it("外部・今日 ≥ 発注推奨日・有効案件なしなら orderNow（境界: 推奨日当日）", () => {
    expect(deriveItemStatus(buildItem(), [], null, "2026-07-07")).toBe(ITEM_STATUS.ORDER_NOW);
  });

  it("発注推奨日の前日は orderNow にならない（この例では dueSoon 窓にも入っていない）", () => {
    // 2026-07-06 は推奨日(07-07)前かつ dueSoon 開始日(07-01)後 → dueSoon
    expect(deriveItemStatus(buildItem(), [], null, "2026-07-06")).toBe(ITEM_STATUS.DUE_SOON);
  });

  it("orderNow は有効な案件（planned 含む）があると成立しない", () => {
    const planned = [buildOrder(ORDER_STATUS.PLANNED)];
    // planned は inProgress の対象でもないため dueSoon 窓内なら dueSoon まで落ちる
    expect(deriveItemStatus(buildItem(), planned, null, "2026-07-07")).toBe(ITEM_STATUS.DUE_SOON);
  });

  it("completed / cancelled の案件は「有効な案件」ではないので orderNow が成立する", () => {
    const finished = [buildOrder(ORDER_STATUS.COMPLETED), buildOrder(ORDER_STATUS.CANCELLED)];
    expect(deriveItemStatus(buildItem(), finished, null, "2026-07-07")).toBe(ITEM_STATUS.ORDER_NOW);
  });

  it("外部・ordered の案件があれば inProgress", () => {
    const orders = [buildOrder(ORDER_STATUS.ORDERED)];
    expect(deriveItemStatus(buildItem(), orders, null, "2026-07-07")).toBe(ITEM_STATUS.IN_PROGRESS);
  });

  it("外部・inCalibration の案件があれば inProgress", () => {
    const orders = [buildOrder(ORDER_STATUS.IN_CALIBRATION)];
    expect(deriveItemStatus(buildItem(), orders, null, "2026-07-07")).toBe(ITEM_STATUS.IN_PROGRESS);
  });

  it("他項目の案件は判定に影響しない（itemId で絞り込む）", () => {
    const otherItemOrders = [buildOrder(ORDER_STATUS.ORDERED, "item-other")];
    expect(deriveItemStatus(buildItem(), otherItemOrders, null, "2026-07-07")).toBe(
      ITEM_STATUS.ORDER_NOW,
    );
  });

  it("今日 ≥ nextDueDate − noticeDaysBefore なら dueSoon（境界: 開始日当日）", () => {
    const internalItem = buildItem({ execution: EXECUTION.INTERNAL, vendorId: undefined });
    expect(deriveItemStatus(internalItem, [], null, "2026-07-01")).toBe(ITEM_STATUS.DUE_SOON);
  });

  it("期限当日は dueSoon（overdue ではない）", () => {
    const internalItem = buildItem({ execution: EXECUTION.INTERNAL, vendorId: undefined });
    expect(deriveItemStatus(internalItem, [], null, "2026-07-31")).toBe(ITEM_STATUS.DUE_SOON);
  });

  it("dueSoon 開始日の前日は ok", () => {
    const internalItem = buildItem({ execution: EXECUTION.INTERNAL, vendorId: undefined });
    expect(deriveItemStatus(internalItem, [], null, "2026-06-30")).toBe(ITEM_STATUS.OK);
  });

  it("内部実施は orderNow / inProgress にならない（発注の概念がない）", () => {
    const internalItem = buildItem({ execution: EXECUTION.INTERNAL, vendorId: undefined });
    const orders = [buildOrder(ORDER_STATUS.ORDERED)];
    expect(deriveItemStatus(internalItem, orders, null, "2026-07-07")).toBe(ITEM_STATUS.DUE_SOON);
  });

  it("item に納期が無くても vendor の標準納期で orderNow を判定できる（フォールバック）", () => {
    const item = buildItem({ leadTimeDays: undefined });
    expect(deriveItemStatus(item, [], { standardLeadTimeDays: 10 }, "2026-07-07")).toBe(
      ITEM_STATUS.ORDER_NOW,
    );
  });

  it("納期がどこからも解決できない外部項目は orderNow にならない（推奨日を計算できない）", () => {
    const item = buildItem({ leadTimeDays: undefined });
    expect(deriveItemStatus(item, [], null, "2026-07-07")).toBe(ITEM_STATUS.DUE_SOON);
  });
});
