import { computeExpectedNotifications, type NotificationSeed } from "@/domain/notificationRules";
import {
  type ServiceOrder,
  type Equipment,
  EQUIPMENT_STATUS,
  EXECUTION,
  type ServiceItem,
  SERVICE_ITEM_TYPE,
  NOTIFICATION_TARGET_TYPE,
  NOTIFICATION_TYPE,
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

const equipmentRecord: Record<string, Equipment> = {
  "equipment-1": {
    id: "equipment-1",
    managementNo: "EQ-001",
    name: "ノギス",
    status: EQUIPMENT_STATUS.ACTIVE,
  },
};

const buildOrder = (
  status: OrderStatus,
  overrides: Partial<ServiceOrder> = {},
): ServiceOrder => ({
  id: "order-1",
  serviceItemId: "item-1",
  vendorId: "vendor-1",
  status,
  ...overrides,
});

/** 引数省略時は案件・vendor なしで判定する */
const compute = (
  serviceItems: ServiceItem[],
  orders: ServiceOrder[],
  today: string,
): NotificationSeed[] =>
  computeExpectedNotifications(serviceItems, orders, {}, equipmentRecord, today);

describe("computeExpectedNotifications: dueSoon / overdue", () => {
  it("今日 ≥ 期限 − noticeDaysBefore なら dueSoon（境界: 開始日当日）", () => {
    const seeds = compute([buildServiceItem()], [], "2026-07-01");
    expect(seeds).toEqual([
      {
        type: NOTIFICATION_TYPE.DUE_SOON,
        targetType: NOTIFICATION_TARGET_TYPE.SERVICE_ITEM,
        targetId: "item-1",
        personId: "person-1",
        message: "EQ-001 年次校正の期限が近づいています",
      },
    ]);
  });

  it("通知窓より前は何も生成しない", () => {
    expect(compute([buildServiceItem()], [], "2026-06-30")).toEqual([]);
  });

  it("期限当日は dueSoon（overdue は厳密な超過のみ）", () => {
    const types = compute([buildServiceItem()], [], "2026-07-31").map((seed) => seed.type);
    expect(types).toContain(NOTIFICATION_TYPE.DUE_SOON);
    expect(types).not.toContain(NOTIFICATION_TYPE.OVERDUE);
  });

  it("今日 > 期限なら overdue を生成し、dueSoon は生成しない（実装判断: 二重通知の抑止）", () => {
    const seeds = compute([buildServiceItem()], [], "2026-08-01");
    expect(seeds).toContainEqual({
      type: NOTIFICATION_TYPE.OVERDUE,
      targetType: NOTIFICATION_TARGET_TYPE.SERVICE_ITEM,
      targetId: "item-1",
      personId: "person-1",
      message: "EQ-001 年次校正が期限を過ぎています",
    });
    expect(seeds.map((seed) => seed.type)).not.toContain(NOTIFICATION_TYPE.DUE_SOON);
  });

  it("期限超過の外部・未発注項目には overdue と orderRecommended が併発する（種別が異なるため両立）", () => {
    const types = compute([buildServiceItem()], [], "2026-08-01").map((seed) => seed.type);
    expect(types.toSorted()).toEqual(
      [NOTIFICATION_TYPE.OVERDUE, NOTIFICATION_TYPE.ORDER_RECOMMENDED].toSorted(),
    );
  });

  it("内部実施の項目にも dueSoon / overdue は発生する（対象: 内部・外部）", () => {
    const internalServiceItem = buildServiceItem({
      execution: EXECUTION.INTERNAL,
      vendorId: undefined,
    });
    expect(compute([internalServiceItem], [], "2026-08-01").map((seed) => seed.type)).toEqual([
      NOTIFICATION_TYPE.OVERDUE,
    ]);
  });

  it("参照先の機器が見つからない場合は管理番号プレフィックスなしの通知文になる", () => {
    const orphanServiceItem = buildServiceItem({ equipmentId: "equipment-missing" });
    const seeds = compute([orphanServiceItem], [], "2026-08-01");
    expect(seeds[0]?.message).toBe("年次校正が期限を過ぎています");
  });
});

describe("computeExpectedNotifications: orderRecommended", () => {
  it("外部・今日 ≥ 発注推奨日・有効案件なしなら orderRecommended（境界: 推奨日当日）", () => {
    const seeds = compute([buildServiceItem()], [], "2026-07-07");
    expect(seeds).toContainEqual({
      type: NOTIFICATION_TYPE.ORDER_RECOMMENDED,
      targetType: NOTIFICATION_TARGET_TYPE.SERVICE_ITEM,
      targetId: "item-1",
      personId: "person-1",
      message: "EQ-001 年次校正の発注時期です",
    });
  });

  it("推奨日の前日は生成しない", () => {
    const types = compute([buildServiceItem()], [], "2026-07-06").map((seed) => seed.type);
    expect(types).not.toContain(NOTIFICATION_TYPE.ORDER_RECOMMENDED);
  });

  it("有効な案件（planned 含む）があれば生成しない（「未発注」の解釈）", () => {
    const types = compute(
      [buildServiceItem()],
      [buildOrder(ORDER_STATUS.PLANNED)],
      "2026-07-07",
    ).map((seed) => seed.type);
    expect(types).not.toContain(NOTIFICATION_TYPE.ORDER_RECOMMENDED);
  });

  it("completed / cancelled のみの案件なら生成する（有効な案件ではない）", () => {
    const orders = [
      buildOrder(ORDER_STATUS.COMPLETED, { id: "order-done" }),
      buildOrder(ORDER_STATUS.CANCELLED, { id: "order-cancelled" }),
    ];
    const types = compute([buildServiceItem()], orders, "2026-07-07").map((seed) => seed.type);
    expect(types).toContain(NOTIFICATION_TYPE.ORDER_RECOMMENDED);
  });

  it("内部実施の項目には生成しない（対象: 外部のみ）", () => {
    const internalServiceItem = buildServiceItem({
      execution: EXECUTION.INTERNAL,
      vendorId: undefined,
    });
    const types = compute([internalServiceItem], [], "2026-07-07").map((seed) => seed.type);
    expect(types).not.toContain(NOTIFICATION_TYPE.ORDER_RECOMMENDED);
  });

  it("serviceItem に納期が無い場合は vendors の標準納期にフォールバックして判定する", () => {
    const serviceItem = buildServiceItem({ leadTimeDays: undefined });
    const vendors = {
      "vendor-1": {
        id: "vendor-1",
        name: "テスト校正",
        isManufacturer: false,
        isCalibrator: true,
        standardLeadTimeDays: 10,
      },
    };
    const seeds = computeExpectedNotifications(
      [serviceItem],
      [],
      vendors,
      equipmentRecord,
      "2026-07-07",
    );
    expect(seeds.map((seed) => seed.type)).toContain(NOTIFICATION_TYPE.ORDER_RECOMMENDED);
  });

  it("vendorId 未設定でも serviceItem 側の納期があれば生成できる（依頼先未定の外部項目）", () => {
    const serviceItem = buildServiceItem({ vendorId: undefined });
    const types = compute([serviceItem], [], "2026-07-07").map((seed) => seed.type);
    expect(types).toContain(NOTIFICATION_TYPE.ORDER_RECOMMENDED);
  });

  it("納期がどこからも解決できない場合は生成しない（推奨日を計算できない）", () => {
    const serviceItem = buildServiceItem({ leadTimeDays: undefined });
    const types = compute([serviceItem], [], "2026-07-07").map((seed) => seed.type);
    expect(types).not.toContain(NOTIFICATION_TYPE.ORDER_RECOMMENDED);
  });
});

describe("computeExpectedNotifications: deliveryDueSoon / deliveryOverdue", () => {
  const orderedWithDueDate = buildOrder(ORDER_STATUS.ORDERED, { dueDate: "2026-07-10" });

  it("今日 ≥ 返却予定日 − 7日 かつ 未返却なら deliveryDueSoon（境界: 7日前当日）", () => {
    const seeds = compute([buildServiceItem()], [orderedWithDueDate], "2026-07-03");
    expect(seeds).toContainEqual({
      type: NOTIFICATION_TYPE.DELIVERY_DUE_SOON,
      targetType: NOTIFICATION_TARGET_TYPE.ORDER,
      targetId: "order-1",
      personId: "person-1",
      message: "EQ-001 年次校正の返却予定日が近づいています",
    });
  });

  it("8日前は生成しない", () => {
    const types = compute([buildServiceItem()], [orderedWithDueDate], "2026-07-02").map(
      (seed) => seed.type,
    );
    expect(types).not.toContain(NOTIFICATION_TYPE.DELIVERY_DUE_SOON);
  });

  it("返却予定日当日は deliveryDueSoon（超過ではない）", () => {
    const types = compute([buildServiceItem()], [orderedWithDueDate], "2026-07-10").map(
      (seed) => seed.type,
    );
    expect(types).toContain(NOTIFICATION_TYPE.DELIVERY_DUE_SOON);
    expect(types).not.toContain(NOTIFICATION_TYPE.DELIVERY_OVERDUE);
  });

  it("今日 > 返却予定日なら deliveryOverdue を生成し、deliveryDueSoon は生成しない", () => {
    const seeds = compute([buildServiceItem()], [orderedWithDueDate], "2026-07-11");
    const deliveryTypes = seeds
      .filter((seed) => seed.targetType === NOTIFICATION_TARGET_TYPE.ORDER)
      .map((seed) => seed.type);
    expect(deliveryTypes).toEqual([NOTIFICATION_TYPE.DELIVERY_OVERDUE]);
  });

  it("inCalibration の案件も対象（発注済・未返却）", () => {
    const inCalibration = buildOrder(ORDER_STATUS.IN_CALIBRATION, { dueDate: "2026-07-10" });
    const types = compute([buildServiceItem()], [inCalibration], "2026-07-11").map(
      (seed) => seed.type,
    );
    expect(types).toContain(NOTIFICATION_TYPE.DELIVERY_OVERDUE);
  });

  it("planned / returned / completed / cancelled の案件は対象外", () => {
    const notAwaiting = [
      buildOrder(ORDER_STATUS.PLANNED, { id: "order-planned", dueDate: "2026-07-10" }),
      buildOrder(ORDER_STATUS.RETURNED, { id: "order-returned", dueDate: "2026-07-10" }),
      buildOrder(ORDER_STATUS.COMPLETED, { id: "order-completed", dueDate: "2026-07-10" }),
      buildOrder(ORDER_STATUS.CANCELLED, { id: "order-cancelled", dueDate: "2026-07-10" }),
    ];
    const seeds = compute([buildServiceItem()], notAwaiting, "2026-07-11");
    const deliveryTypes = seeds.filter(
      (seed) => seed.targetType === NOTIFICATION_TARGET_TYPE.ORDER,
    );
    expect(deliveryTypes).toEqual([]);
  });

  it("返却予定日が未入力の案件は対象外", () => {
    const noDueDate = buildOrder(ORDER_STATUS.ORDERED);
    const seeds = compute([buildServiceItem()], [noDueDate], "2026-07-11");
    expect(seeds.filter((seed) => seed.targetType === NOTIFICATION_TARGET_TYPE.ORDER)).toEqual([]);
  });

  it("serviceItems に含まれない項目の案件は対象外（宛先を解決できないため）", () => {
    const orphanOrder = buildOrder(ORDER_STATUS.ORDERED, {
      serviceItemId: "item-unknown",
      dueDate: "2026-07-10",
    });
    expect(compute([], [orphanOrder], "2026-07-11")).toEqual([]);
  });

  it("宛先は order.serviceItemId から辿った serviceItem.personId になる（Order に personId は無い）", () => {
    const seeds = compute(
      [buildServiceItem({ personId: "person-42" })],
      [orderedWithDueDate],
      "2026-07-11",
    );
    const delivery = seeds.find((seed) => seed.targetType === NOTIFICATION_TARGET_TYPE.ORDER);
    expect(delivery?.personId).toBe("person-42");
  });
});

describe("computeExpectedNotifications: 複合", () => {
  it("同一項目に serviceItem 宛と order 宛の通知が同時に発生し得る（overdue + deliveryOverdue）", () => {
    const lateOrder = buildOrder(ORDER_STATUS.ORDERED, { dueDate: "2026-08-05" });
    const seeds = compute([buildServiceItem()], [lateOrder], "2026-08-10");
    expect(seeds.map((seed) => seed.type).toSorted()).toEqual(
      [NOTIFICATION_TYPE.OVERDUE, NOTIFICATION_TYPE.DELIVERY_OVERDUE].toSorted(),
    );
  });

  it("対象項目が空なら何も生成しない", () => {
    expect(compute([], [], "2026-07-15")).toEqual([]);
  });
});
