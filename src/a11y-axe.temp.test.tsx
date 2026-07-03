/**
 * 一時検証用: axe-core による全11ルートの a11y スモークテスト（後で削除予定・恒久コードではない）。
 * 依頼: axe-core を直接 import して <App /> を各ルートでレンダーし、violations の impact が
 * critical/serious のものが0件であることを確認する。詳細は violations 全件を console.log する。
 */

import App from "@/App";
import { ROUTES, equipmentDetailPath, equipmentEditPath } from "@/constants/routes";
import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  ITEM_TYPE,
  NOTIFICATION_TARGET_TYPE,
  NOTIFICATION_TYPE,
  ORDER_STATUS,
  RECORD_RESULT,
  type CalibrationOrder,
  type Equipment,
  type InspectionItem,
  type InspectionRecord,
  type Notification,
  type Person,
  type Vendor,
} from "@/store/types";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { addDays, todayIsoDate } from "@/utils/time";
import axe from "axe-core";
import { beforeEach, describe, expect, it } from "vitest";

// axe.run はDOM全体を精査するため既定の5秒タイムアウトでは不足するケースがある。
const AXE_TEST_TIMEOUT_MS = 30_000;

const today = todayIsoDate();

// --- シードデータ（5ステータス: overdue/orderNow/dueSoon/inProgress/ok を出す） ---

const vendorCalibrator: Vendor = {
  id: "vendor-cal",
  name: "校正センター",
  isManufacturer: false,
  isCalibrator: true,
  contactPerson: "山田",
  email: "vendor@example.com",
  phone: "03-1111-2222",
  standardLeadTimeDays: 20,
  note: "検証用ベンダー",
};

const vendorManufacturer: Vendor = {
  id: "vendor-mfg",
  name: "計測機器メーカー",
  isManufacturer: true,
  isCalibrator: false,
};

const personTanaka: Person = {
  id: "person-tanaka",
  name: "田中",
  email: "tanaka@example.com",
  department: "品質管理部",
  isActive: true,
};

const personSato: Person = {
  id: "person-sato",
  name: "佐藤",
  email: "sato@example.com",
  isActive: false,
};

const equipmentA: Equipment = {
  id: "equipment-a",
  managementNo: "EQ-001",
  name: "ノギス",
  model: "CD-15",
  serialNo: "SN-0001",
  manufacturerId: vendorManufacturer.id,
  location: "1F工場",
  status: EQUIPMENT_STATUS.ACTIVE,
};

const equipmentB: Equipment = {
  id: "equipment-b",
  managementNo: "EQ-002",
  name: "はかり",
  status: EQUIPMENT_STATUS.ACTIVE,
};

const equipmentSuspended: Equipment = {
  id: "equipment-c",
  managementNo: "EQ-003",
  name: "圧力計",
  status: EQUIPMENT_STATUS.SUSPENDED,
};

/** overdue: 今日 > nextDueDate（内部実施） */
const itemOverdue: InspectionItem = {
  id: "item-overdue",
  equipmentId: equipmentA.id,
  type: ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: CYCLE.Y1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: personTanaka.id,
  noticeDaysBefore: 30,
  lastDoneDate: "2024-01-01",
  nextDueDate: "2000-01-01",
  isActive: true,
};

/** dueSoon: 今日 >= nextDueDate - noticeDaysBefore（内部実施） */
const itemDueSoon: InspectionItem = {
  id: "item-duesoon",
  equipmentId: equipmentA.id,
  type: ITEM_TYPE.INSPECTION,
  name: "月次点検",
  cycle: CYCLE.M1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: personTanaka.id,
  noticeDaysBefore: 30,
  nextDueDate: addDays(today, 5) ?? today,
  isActive: true,
};

/** orderNow: 外部・今日 >= 発注推奨日・有効な案件なし */
const itemOrderNow: InspectionItem = {
  id: "item-ordernow",
  equipmentId: equipmentB.id,
  type: ITEM_TYPE.CALIBRATION,
  name: "半期校正",
  cycle: CYCLE.M6,
  execution: EXECUTION.EXTERNAL,
  vendorId: vendorCalibrator.id,
  leadTimeDays: 30,
  bufferDays: 14,
  personId: personTanaka.id,
  noticeDaysBefore: 30,
  nextDueDate: addDays(today, 10) ?? today,
  isActive: true,
};

/** inProgress: 外部・ordered/inCalibration の案件あり */
const itemInProgress: InspectionItem = {
  id: "item-inprogress",
  equipmentId: equipmentB.id,
  type: ITEM_TYPE.CALIBRATION,
  name: "3年校正",
  cycle: CYCLE.Y3,
  execution: EXECUTION.EXTERNAL,
  vendorId: vendorCalibrator.id,
  leadTimeDays: 14,
  bufferDays: 14,
  personId: personTanaka.id,
  noticeDaysBefore: 30,
  lastDoneDate: "2023-01-01",
  nextDueDate: addDays(today, 200) ?? today,
  isActive: true,
};

/** ok: 上記いずれにも該当しない */
const itemOk: InspectionItem = {
  id: "item-ok",
  equipmentId: equipmentA.id,
  type: ITEM_TYPE.INSPECTION,
  name: "week点検",
  cycle: CYCLE.Y5,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: personSato.id,
  noticeDaysBefore: 30,
  nextDueDate: "2099-06-25",
  isActive: true,
};

const recordForOverdue: InspectionRecord = {
  id: "record-1",
  itemId: itemOverdue.id,
  doneDate: "2024-01-01",
  doneBy: "田中",
  result: RECORD_RESULT.PASS,
  note: "検証用実施記録",
};

const orderInProgress: CalibrationOrder = {
  id: "order-inprogress",
  itemId: itemInProgress.id,
  vendorId: vendorCalibrator.id,
  status: ORDER_STATUS.ORDERED,
  orderedDate: today,
  dueDate: addDays(today, 20) ?? today,
  cost: 15000,
};

const orderCompleted: CalibrationOrder = {
  id: "order-completed",
  itemId: itemOverdue.id,
  vendorId: vendorCalibrator.id,
  status: ORDER_STATUS.COMPLETED,
  orderedDate: "2023-12-01",
  dueDate: "2023-12-20",
  returnedDate: "2023-12-18",
  cost: 12000,
};

const notificationOverdue: Notification = {
  id: "notif-overdue",
  type: NOTIFICATION_TYPE.OVERDUE,
  targetType: NOTIFICATION_TARGET_TYPE.ITEM,
  targetId: itemOverdue.id,
  personId: personTanaka.id,
  message: "EQ-001 年次校正が期限超過",
  createdDate: today,
  isRead: false,
};

const notificationOrderRecommended: Notification = {
  id: "notif-order",
  type: NOTIFICATION_TYPE.ORDER_RECOMMENDED,
  targetType: NOTIFICATION_TARGET_TYPE.ITEM,
  targetId: itemOrderNow.id,
  personId: personTanaka.id,
  message: "EQ-002 半期校正の発注推奨日を過ぎています",
  createdDate: today,
  isRead: true,
};

const seedAll = (): void => {
  seedStore({
    vendors: { [vendorCalibrator.id]: vendorCalibrator, [vendorManufacturer.id]: vendorManufacturer },
    persons: { [personTanaka.id]: personTanaka, [personSato.id]: personSato },
    equipment: {
      [equipmentA.id]: equipmentA,
      [equipmentB.id]: equipmentB,
      [equipmentSuspended.id]: equipmentSuspended,
    },
    items: {
      [itemOverdue.id]: itemOverdue,
      [itemDueSoon.id]: itemDueSoon,
      [itemOrderNow.id]: itemOrderNow,
      [itemInProgress.id]: itemInProgress,
      [itemOk.id]: itemOk,
    },
    records: { [recordForOverdue.id]: recordForOverdue },
    orders: { [orderInProgress.id]: orderInProgress, [orderCompleted.id]: orderCompleted },
    notifications: {
      [notificationOverdue.id]: notificationOverdue,
      [notificationOrderRecommended.id]: notificationOrderRecommended,
    },
  });
};

// jsdomでは動作しない/意味のないルールを無効化する。
// - color-contrast: jsdomはレイアウト計算をしないため常に誤検出になる（依頼指示どおり無効化）。
// - color-contrast の判定に依存する canvas 系計測が jsdom 未実装のため追加で無効化。
const AXE_DISABLED_RULES = {
  "color-contrast": { enabled: false },
} as const;

const routesToCheck: ReadonlyArray<{ label: string; path: string }> = [
  { label: "ダッシュボード", path: ROUTES.DASHBOARD },
  { label: "項目一覧", path: ROUTES.ITEM_LIST },
  { label: "機器一覧", path: ROUTES.EQUIPMENT_LIST },
  { label: "機器詳細", path: equipmentDetailPath(equipmentA.id) },
  { label: "機器新規登録", path: ROUTES.EQUIPMENT_NEW },
  { label: "機器編集", path: equipmentEditPath(equipmentA.id) },
  { label: "案件かんばん", path: ROUTES.ORDER_LIST },
  { label: "取引先一覧", path: ROUTES.VENDOR_LIST },
  { label: "担当者一覧", path: ROUTES.PERSON_LIST },
  { label: "通知センター", path: ROUTES.NOTIFICATION_LIST },
  { label: "設定", path: ROUTES.SETTINGS },
];

beforeEach(setupStoreIsolation);

describe("axe-core a11y スモーク（一時検証・全11ルート）", () => {
  for (const { label, path } of routesToCheck) {
    it(
      `${label}（${path}）: critical/serious の violations が0件`,
      async () => {
        seedAll();
        const { container } = renderWithStore(<App />, { initialEntries: [path] });

        const results = await axe.run(container, { rules: AXE_DISABLED_RULES });

        // eslint-disable-next-line no-console -- 一時検証テスト: violations全件を報告用に出力する
        console.log(
          `[axe-core] ${label} (${path}) violations:`,
          JSON.stringify(results.violations, null, 2),
        );

        const seriousOrCritical = results.violations.filter(
          (violation) => violation.impact === "critical" || violation.impact === "serious",
        );

        expect(seriousOrCritical).toEqual([]);
      },
      AXE_TEST_TIMEOUT_MS,
    );
  }
});
