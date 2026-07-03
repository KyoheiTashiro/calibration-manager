/**
 * かんばん（screen-design/08-orders.md）のうち integration.test.tsx が覆わない観点:
 * 中止フロー・トグルON表示・カード表示解決・dangling参照・空状態2種・発注ダイアログの整合警告・列内ソート。
 */

import { OrderList } from "@/features/orders";
import type {
  CalibrationOrder,
  Equipment,
  InspectionItem,
  Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const vendor: Vendor = {
  id: "vendor-1",
  name: "ミツトヨ校正センター",
  isManufacturer: false,
  isCalibrator: true,
};
const equipment: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  status: "active",
};
const item: InspectionItem = {
  id: "item-1",
  equipmentId: "equipment-1",
  type: "calibration",
  name: "年次校正",
  cycle: "1Y",
  execution: "external",
  vendorId: "vendor-1",
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate: "2026-07-10",
  isActive: true,
};

const makeEquipment = (id: string, managementNo: string): Equipment => ({
  id,
  managementNo,
  name: "機器",
  status: "active",
});
const makeItem = (id: string, equipmentId: string): InspectionItem => ({
  ...item,
  id,
  equipmentId,
});

const baseSeed = (orders: Record<string, CalibrationOrder>): void => {
  seedStore({
    vendors: { [vendor.id]: vendor },
    equipment: { [equipment.id]: equipment },
    items: { [item.id]: item },
    orders,
  });
};

beforeEach(setupStoreIsolation);

describe("カード表示", () => {
  it("依頼先名・費用を解決し、未設定属性は「—」で表示する", () => {
    baseSeed({
      "order-1": {
        id: "order-1",
        itemId: "item-1",
        vendorId: "vendor-1",
        status: "ordered",
        orderedDate: "2026-06-01",
        cost: 12_000,
      },
    });
    renderWithStore(<OrderList />);

    expect(screen.getByText("EQ-001")).toBeInTheDocument();
    expect(screen.getByText("ノギス")).toBeInTheDocument();
    expect(screen.getByText("年次校正")).toBeInTheDocument();
    expect(screen.getByText("ミツトヨ校正センター")).toBeInTheDocument();
    expect(screen.getByText("12000円")).toBeInTheDocument();
    // 返却予定日は未設定 → 「—」
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("dangling 参照（item/vendor 不在）でも例外を投げず「(参照先なし)」で表示する", () => {
    seedStore({
      orders: {
        "order-1": {
          id: "order-1",
          itemId: "missing-item",
          vendorId: "missing-vendor",
          status: "planned",
        },
      },
    });
    renderWithStore(<OrderList />);

    // 管理番号・機器名・項目名・依頼先すべてが解決不能 → 複数の「(参照先なし)」
    expect(screen.getAllByText("(参照先なし)").length).toBeGreaterThanOrEqual(3);
  });
});

describe("完了/中止も表示 トグル", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("既定OFFでは記録登録済/中止の列は出ず、ONで右側に追加される", async () => {
    const user = userEvent.setup();
    baseSeed({
      "order-c": { id: "order-c", itemId: "item-1", vendorId: "vendor-1", status: "completed" },
    });
    renderWithStore(<OrderList />);

    // 既定OFF: 完了列は非表示。完了のみのため表示カードは0件でEmptyStateになる
    expect(screen.queryByText("記録登録済")).not.toBeInTheDocument();
    expect(screen.queryByText("中止")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("完了/中止も表示"));

    expect(screen.getByText("記録登録済")).toBeInTheDocument();
    expect(screen.getByText("中止")).toBeInTheDocument();
    // 完了カードにアクションボタンは付かない（D-018）
    expect(screen.queryByRole("button", { name: "記録登録" })).not.toBeInTheDocument();
  });
});

describe("中止フロー", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("中止 → 確認 → cancelled になり、トグルOFFでカードが消える", async () => {
    const user = userEvent.setup();
    baseSeed({
      "order-1": { id: "order-1", itemId: "item-1", vendorId: "vendor-1", status: "planned" },
    });
    renderWithStore(<OrderList />);

    await user.click(screen.getByRole("button", { name: "中止" }));
    // 確認ダイアログ
    await user.click(screen.getByRole("button", { name: "中止する" }));

    expect((useAppStore.getState().orders["order-1"] as CalibrationOrder).status).toBe(
      "cancelled",
    );
    // cancelled はトグルOFFで非表示
    expect(screen.queryByText("EQ-001")).not.toBeInTheDocument();
  });
});

describe("空状態", () => {
  it("表示対象の全列が0件のときEmptyStateと項目一覧導線を出す", () => {
    seedStore({ orders: {} });
    renderWithStore(<OrderList />);

    expect(
      screen.getByText("外部校正案件はありません。項目一覧から案件を作成できます"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "項目一覧へ" })).toBeInTheDocument();
  });

  it("個別列が0件のとき列内に「なし」プレースホルダを出す", () => {
    baseSeed({
      "order-1": { id: "order-1", itemId: "item-1", vendorId: "vendor-1", status: "planned" },
    });
    renderWithStore(<OrderList />);

    // planned 以外の3列（発注済/校正中/返却済）が空 → 「なし」3つ
    expect(screen.getAllByText("なし")).toHaveLength(3);
  });
});

describe("発注ダイアログの整合警告（D-019）", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("発注日 > 返却予定日 で警告を出すが登録はブロックしない", async () => {
    const user = userEvent.setup();
    baseSeed({
      "order-1": { id: "order-1", itemId: "item-1", vendorId: "vendor-1", status: "planned" },
    });
    renderWithStore(<OrderList />);

    await user.click(screen.getByRole("button", { name: "発注する" }));
    const dueDateField = screen.getByLabelText("返却予定日", { exact: false });
    await user.clear(dueDateField);
    await user.type(dueDateField, "2020-01-01");

    expect(screen.getByText("発注日が返却予定日より後になっています")).toBeInTheDocument();

    // 警告があっても確定できる（ブロックしない）
    await user.click(screen.getByRole("button", { name: "確定" }));
    expect((useAppStore.getState().orders["order-1"] as CalibrationOrder).status).toBe("ordered");
    expect((useAppStore.getState().orders["order-1"] as CalibrationOrder).dueDate).toBe(
      "2020-01-01",
    );
  });
});

describe("列内ソート", () => {
  it("dueDate 昇順（未設定は末尾）→ id 昇順で決定的に並ぶ", () => {
    seedStore({
      vendors: { [vendor.id]: vendor },
      equipment: {
        "eq-a": makeEquipment("eq-a", "EQ-A"),
        "eq-b": makeEquipment("eq-b", "EQ-B"),
        "eq-c": makeEquipment("eq-c", "EQ-C"),
      },
      items: {
        "item-a": makeItem("item-a", "eq-a"),
        "item-b": makeItem("item-b", "eq-b"),
        "item-c": makeItem("item-c", "eq-c"),
      },
      orders: {
        "order-a": {
          id: "order-a",
          itemId: "item-a",
          vendorId: "vendor-1",
          status: "planned",
          dueDate: "2026-08-01",
        },
        "order-b": {
          id: "order-b",
          itemId: "item-b",
          vendorId: "vendor-1",
          status: "planned",
          dueDate: "2026-06-01",
        },
        "order-c": {
          id: "order-c",
          itemId: "item-c",
          vendorId: "vendor-1",
          status: "planned",
        },
      },
    });
    renderWithStore(<OrderList />);

    const managementNos = screen
      .getAllByText(/^EQ-[ABC]$/u)
      .map((element) => element.textContent);
    // dueDate 昇順: B(06-01) → A(08-01) → 未設定末尾 C
    expect(managementNos).toEqual(["EQ-B", "EQ-A", "EQ-C"]);
  });
});
