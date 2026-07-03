/**
 * ダッシュボードの集計・選定純関数(hooks.ts)の検証(screen-design/01-dashboard.md)。
 * - countByStatus: 全ステータスの件数集計(該当0のステータスも0で埋める)
 * - actionRequiredRows: overdue/orderNow/dueSoon のみを優先度順に、同グループ内は元順(nextDueDate昇順)維持
 * - latestNotifications: 未読優先 → createdDate 降順 → id 昇順で5件
 * 導出ロジックは inspectionItemRowsOf 側で検証済みのため、ここは合成した InspectionItemRow / Notification で純粋に検証する。
 */

import { INSPECTION_ITEM_STATUS, type InspectionItemStatus } from "@/domain/inspectionItemStatus";
import { actionRequiredRows, countByStatus, latestNotifications } from "@/features/dashboard/hooks";
import type { InspectionItemRow } from "@/store/selectors";
import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  INSPECTION_ITEM_TYPE,
  NOTIFICATION_TARGET_TYPE,
  NOTIFICATION_TYPE,
  type Equipment,
  type InspectionItem,
  type Notification,
} from "@/store/types";
import { describe, expect, it } from "vitest";

const makeEquipment = (id: string): Equipment => ({
  id,
  managementNo: `EQ-${id}`,
  name: `機器${id}`,
  status: EQUIPMENT_STATUS.ACTIVE,
});

const makeInspectionItem = (id: string, equipmentId: string, nextDueDate: string): InspectionItem => ({
  id,
  equipmentId,
  type: INSPECTION_ITEM_TYPE.INSPECTION,
  name: `項目${id}`,
  cycle: CYCLE.Y1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate,
  isActive: true,
});

/** テスト用の合成 InspectionItemRow(status を直接指定。nextDueDate 昇順で並んだ入力を模す) */
const makeRow = (id: string, status: InspectionItemStatus, nextDueDate: string): InspectionItemRow => ({
  inspectionItem: makeInspectionItem(id, `eq-${id}`, nextDueDate),
  equipment: makeEquipment(id),
  status,
  personLabel: "田中",
  recommendedOrderDate: null,
  canCreateOrder: false,
});

const makeNotification = (
  overrides: Partial<Notification> & Pick<Notification, "id">,
): Notification => ({
  type: NOTIFICATION_TYPE.OVERDUE,
  targetType: NOTIFICATION_TARGET_TYPE.INSPECTION_ITEM,
  targetId: "item-1",
  personId: "person-1",
  message: `通知${overrides.id}`,
  createdDate: "2026-07-01",
  isRead: false,
  ...overrides,
});

describe("countByStatus", () => {
  it("全ステータスを集計し、該当0のステータスも0で埋める", () => {
    const rows: InspectionItemRow[] = [
      makeRow("1", INSPECTION_ITEM_STATUS.OVERDUE, "2026-06-01"),
      makeRow("2", INSPECTION_ITEM_STATUS.OVERDUE, "2026-06-02"),
      makeRow("3", INSPECTION_ITEM_STATUS.ORDER_NOW, "2026-07-10"),
      makeRow("4", INSPECTION_ITEM_STATUS.DUE_SOON, "2026-07-20"),
      makeRow("5", INSPECTION_ITEM_STATUS.DUE_SOON, "2026-07-21"),
      makeRow("6", INSPECTION_ITEM_STATUS.OK, "2027-01-01"),
    ];

    expect(countByStatus(rows)).toEqual({
      [INSPECTION_ITEM_STATUS.OVERDUE]: 2,
      [INSPECTION_ITEM_STATUS.ORDER_NOW]: 1,
      [INSPECTION_ITEM_STATUS.IN_PROGRESS]: 0,
      [INSPECTION_ITEM_STATUS.DUE_SOON]: 2,
      [INSPECTION_ITEM_STATUS.OK]: 1,
    });
  });

  it("空配列なら全ステータス0", () => {
    expect(countByStatus([])).toEqual({
      [INSPECTION_ITEM_STATUS.OVERDUE]: 0,
      [INSPECTION_ITEM_STATUS.ORDER_NOW]: 0,
      [INSPECTION_ITEM_STATUS.IN_PROGRESS]: 0,
      [INSPECTION_ITEM_STATUS.DUE_SOON]: 0,
      [INSPECTION_ITEM_STATUS.OK]: 0,
    });
  });
});

describe("actionRequiredRows", () => {
  it("inProgress/ok を除外し、overdue→orderNow→dueSoon の優先度順に並べる", () => {
    // 入力は nextDueDate 昇順(inspectionItemRowsOf の保証)を模した順序
    const rows: InspectionItemRow[] = [
      makeRow("due", INSPECTION_ITEM_STATUS.DUE_SOON, "2026-07-20"),
      makeRow("prog", INSPECTION_ITEM_STATUS.IN_PROGRESS, "2026-07-22"),
      makeRow("order", INSPECTION_ITEM_STATUS.ORDER_NOW, "2026-07-25"),
      makeRow("ok", INSPECTION_ITEM_STATUS.OK, "2027-01-01"),
      makeRow("over", INSPECTION_ITEM_STATUS.OVERDUE, "2026-06-01"),
    ];

    const result = actionRequiredRows(rows);

    expect(result.map((row) => row.inspectionItem.id)).toEqual(["over", "order", "due"]);
  });

  it("同一優先度グループ内は入力順(nextDueDate昇順)を安定に保つ", () => {
    const rows: InspectionItemRow[] = [
      makeRow("over-a", INSPECTION_ITEM_STATUS.OVERDUE, "2026-06-01"),
      makeRow("over-b", INSPECTION_ITEM_STATUS.OVERDUE, "2026-06-05"),
      makeRow("due-a", INSPECTION_ITEM_STATUS.DUE_SOON, "2026-07-10"),
      makeRow("due-b", INSPECTION_ITEM_STATUS.DUE_SOON, "2026-07-15"),
    ];

    const result = actionRequiredRows(rows);

    expect(result.map((row) => row.inspectionItem.id)).toEqual(["over-a", "over-b", "due-a", "due-b"]);
  });

  it("要対応が0件なら空配列", () => {
    const rows: InspectionItemRow[] = [
      makeRow("ok", INSPECTION_ITEM_STATUS.OK, "2027-01-01"),
      makeRow("prog", INSPECTION_ITEM_STATUS.IN_PROGRESS, "2026-07-22"),
    ];
    expect(actionRequiredRows(rows)).toEqual([]);
  });
});

describe("latestNotifications", () => {
  it("未読優先 → createdDate 降順 → id 昇順 で5件返す", () => {
    const notifications: Record<string, Notification> = {
      n1: makeNotification({ id: "n1", createdDate: "2026-07-01", isRead: true }),
      n2: makeNotification({ id: "n2", createdDate: "2026-07-05", isRead: false }),
      n3: makeNotification({ id: "n3", createdDate: "2026-07-05", isRead: false }),
      n4: makeNotification({ id: "n4", createdDate: "2026-07-03", isRead: false }),
      n5: makeNotification({ id: "n5", createdDate: "2026-07-10", isRead: true }),
      n6: makeNotification({ id: "n6", createdDate: "2026-07-02", isRead: false }),
    };

    const result = latestNotifications(notifications);

    // 未読(n2,n3,n4,n6)を createdDate 降順・id 昇順 → n2,n3,n4,n6、続いて既読を降順 → n5
    expect(result.map((notification) => notification.id)).toEqual(["n2", "n3", "n4", "n6", "n5"]);
  });

  it("5件を超えたら先頭5件のみに切り詰める", () => {
    const notifications: Record<string, Notification> = {};
    for (let index = 0; index < 8; index += 1) {
      const id = `n${index}`;
      notifications[id] = makeNotification({
        id,
        createdDate: `2026-07-0${index + 1}`,
        isRead: false,
      });
    }

    expect(latestNotifications(notifications)).toHaveLength(5);
  });

  it("0件なら空配列", () => {
    expect(latestNotifications({})).toEqual([]);
  });
});
