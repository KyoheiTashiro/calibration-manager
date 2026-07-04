/**
 * EquipmentList（/equipment）の検証（screen-design/02-equipment-list.md）。
 * 一覧表示・メーカー名解決・項目数・最寄り期限算出・状態フィルタ・検索・行クリック遷移・
 * 追加ボタン遷移・空状態2種を扱う。
 */

import { ROUTES } from "@/constants/routes";
import { EquipmentList } from "@/features/equipment/list";
import {
  EQUIPMENT_STATUS,
  INSPECTION_ITEM_TYPE,
  CYCLE,
  EXECUTION,
  type Equipment,
  type InspectionItem,
  type Vendor,
} from "@/store/types";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

/** 遷移先確認用のダミー機器詳細画面(useParamsで:idを表示するだけ) */
const DummyEquipmentDetail = (): ReactElement => {
  const { id } = useParams();
  return <p>機器詳細:{id}</p>;
};

/** 行内の最終列(次回期限セル)を取得する(型式/メーカー/設置場所にも「—」が出るため列位置で特定する) */
const dueDateCellOf = (row: HTMLElement): HTMLElement => {
  const cells = within(row).getAllByRole("cell");
  const lastCell = cells.at(-1);
  if (!lastCell) throw new Error("次回期限セルが見つかりません");
  return lastCell;
};

const mitutoyo: Vendor = {
  id: "vendor-1",
  name: "ミツトヨ",
  isManufacturer: true,
  isCalibrator: false,
};

const activeEquipmentWithDue: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  model: "CD-15",
  manufacturerId: mitutoyo.id,
  location: "検査室",
  status: EQUIPMENT_STATUS.ACTIVE,
};

const activeEquipmentNoVendor: Equipment = {
  id: "equipment-2",
  managementNo: "EQ-002",
  name: "マイクロメータ",
  status: EQUIPMENT_STATUS.ACTIVE,
};

const suspendedEquipment: Equipment = {
  id: "equipment-3",
  managementNo: "EQ-003",
  name: "電子はかり",
  status: EQUIPMENT_STATUS.SUSPENDED,
};

const retiredEquipment: Equipment = {
  id: "equipment-4",
  managementNo: "EQ-004",
  name: "廃棄済み機器",
  status: EQUIPMENT_STATUS.RETIRED,
};

const makeInspectionItem = (
  overrides: Partial<InspectionItem> & Pick<InspectionItem, "id" | "equipmentId">,
): InspectionItem => ({
  type: INSPECTION_ITEM_TYPE.INSPECTION,
  name: "定期点検",
  cycle: CYCLE.Y1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate: "2026-08-20",
  isActive: true,
  ...overrides,
});

const renderEquipmentListWithRoutes = (): ReactElement => (
  <Routes>
    <Route path={ROUTES.EQUIPMENT_LIST} element={<EquipmentList />} />
    <Route path={ROUTES.EQUIPMENT_DETAIL} element={<DummyEquipmentDetail />} />
    <Route path={ROUTES.EQUIPMENT_CREATE} element={<p>機器登録画面</p>} />
  </Routes>
);

beforeEach(setupStoreIsolation);

describe("EquipmentList: 一覧表示", () => {
  it("メーカー名解決・項目数・最寄り期限(active機器・active項目あり)を表示する", () => {
    seedStore({
      vendors: { [mitutoyo.id]: mitutoyo },
      equipment: {
        [activeEquipmentWithDue.id]: activeEquipmentWithDue,
        [activeEquipmentNoVendor.id]: activeEquipmentNoVendor,
      },
      inspectionItems: {
        "item-1": makeInspectionItem({
          id: "item-1",
          equipmentId: activeEquipmentWithDue.id,
          nextDueDate: "2026-09-01",
        }),
        "item-2": makeInspectionItem({
          id: "item-2",
          equipmentId: activeEquipmentWithDue.id,
          nextDueDate: "2026-08-15",
        }),
      },
    });
    renderWithStore(<EquipmentList />);

    const noginsuRow = screen.getByRole("row", { name: /EQ-001/u });
    expect(within(noginsuRow).getByText("ノギス")).toBeInTheDocument();
    expect(within(noginsuRow).getByText("CD-15")).toBeInTheDocument();
    expect(within(noginsuRow).getByText("ミツトヨ")).toBeInTheDocument();
    expect(within(noginsuRow).getByText("検査室")).toBeInTheDocument();
    expect(within(noginsuRow).getByText("稼働")).toBeInTheDocument();
    expect(within(noginsuRow).getByText("2")).toBeInTheDocument();
    // なぜ 08-15 か: item-1(09-01)とitem-2(08-15)の最小値
    expect(within(noginsuRow).getByText("2026-08-15")).toBeInTheDocument();

    // メーカー未設定機器は型式・メーカー・設置場所・期限が「—」(項目0件のため項目数は"0")
    const microRow = screen.getByRole("row", { name: /EQ-002/u });
    expect(within(microRow).getByText("0")).toBeInTheDocument();
    expect(within(microRow).getAllByText("—")).toHaveLength(4);
  });
});

describe("EquipmentList: 非稼働機器の期限", () => {
  it("suspended機器は有効項目があっても期限が—になる", () => {
    seedStore({
      equipment: { [suspendedEquipment.id]: suspendedEquipment },
      inspectionItems: {
        "item-1": makeInspectionItem({
          id: "item-1",
          equipmentId: suspendedEquipment.id,
          nextDueDate: "2026-08-15",
          isActive: true,
        }),
      },
    });
    renderWithStore(<EquipmentList />);

    const row = screen.getByRole("row", { name: /EQ-003/u });
    expect(dueDateCellOf(row)).toHaveTextContent("—");
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("retired機器はデフォルトフィルタで非表示だが、全てフィルタに切り替えても期限は—になる", async () => {
    const user = userEvent.setup();
    seedStore({
      equipment: { [retiredEquipment.id]: retiredEquipment },
      inspectionItems: {
        "item-1": makeInspectionItem({
          id: "item-1",
          equipmentId: retiredEquipment.id,
          nextDueDate: "2026-08-15",
          isActive: true,
        }),
      },
    });
    renderWithStore(<EquipmentList />);

    expect(screen.queryByText("EQ-004")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("状態"), "全て");
    const row = screen.getByRole("row", { name: /EQ-004/u });
    expect(dueDateCellOf(row)).toHaveTextContent("—");
  });
});

describe("EquipmentList: active機器でisActive項目のみ", () => {
  it("isActive=falseの項目しかなければ期限は—になる", () => {
    seedStore({
      equipment: { [activeEquipmentNoVendor.id]: activeEquipmentNoVendor },
      inspectionItems: {
        "item-1": makeInspectionItem({
          id: "item-1",
          equipmentId: activeEquipmentNoVendor.id,
          nextDueDate: "2026-08-15",
          isActive: false,
        }),
      },
    });
    renderWithStore(<EquipmentList />);

    const row = screen.getByRole("row", { name: /EQ-002/u });
    expect(within(row).getByText("1")).toBeInTheDocument();
    expect(dueDateCellOf(row)).toHaveTextContent("—");
  });
});

describe("EquipmentList: 状態フィルタ", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("デフォルトはretiredを表示せず、全てに切り替えると表示される", async () => {
    const user = userEvent.setup();
    seedStore({
      equipment: {
        [activeEquipmentWithDue.id]: activeEquipmentWithDue,
        [retiredEquipment.id]: retiredEquipment,
      },
    });
    renderWithStore(<EquipmentList />);

    expect(screen.getByText("EQ-001")).toBeInTheDocument();
    expect(screen.queryByText("EQ-004")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("状態"), "全て");

    expect(screen.getByText("EQ-001")).toBeInTheDocument();
    expect(screen.getByText("EQ-004")).toBeInTheDocument();
  });
});

describe("EquipmentList: 検索", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("managementNo/name/modelの部分一致(大文字小文字無視)で絞り込む", async () => {
    const user = userEvent.setup();
    seedStore({
      equipment: {
        [activeEquipmentWithDue.id]: activeEquipmentWithDue,
        [activeEquipmentNoVendor.id]: activeEquipmentNoVendor,
      },
    });
    renderWithStore(<EquipmentList />);

    await user.type(screen.getByLabelText("検索"), "cd-15");

    expect(screen.getByText("EQ-001")).toBeInTheDocument();
    expect(screen.queryByText("EQ-002")).not.toBeInTheDocument();
  });
});

describe("EquipmentList: 行クリック・追加ボタン遷移", () => {
  const renderWithRoutes = (): void => {
    seedStore({ equipment: { [activeEquipmentWithDue.id]: activeEquipmentWithDue } });
    renderWithStore(renderEquipmentListWithRoutes(), { initialEntries: [ROUTES.EQUIPMENT_LIST] });
  };

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("行クリックで機器詳細へ遷移する", async () => {
    const user = userEvent.setup();
    renderWithRoutes();
    await user.click(screen.getByRole("row", { name: /EQ-001/u }));
    expect(screen.getByText(`機器詳細:${activeEquipmentWithDue.id}`)).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("「+ 機器を追加」で機器登録画面へ遷移する", async () => {
    const user = userEvent.setup();
    renderWithRoutes();
    await user.click(screen.getByRole("button", { name: "+ 機器を追加" }));
    expect(screen.getByText("機器登録画面")).toBeInTheDocument();
  });
});

describe("EquipmentList: 空状態", () => {
  it("0件時は検索・フィルタを隠しCTA付きEmptyStateを表示する", () => {
    renderWithStore(<EquipmentList />);

    expect(screen.getByText("機器が未登録です")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "+ 機器を追加" })).toHaveLength(2);
    expect(screen.queryByLabelText("検索")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("状態")).not.toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("検索結果0件時は検索・フィルタを表示したままCTAなしのEmptyStateを表示する", async () => {
    const user = userEvent.setup();
    seedStore({ equipment: { [activeEquipmentWithDue.id]: activeEquipmentWithDue } });
    renderWithStore(<EquipmentList />);

    await user.type(screen.getByLabelText("検索"), "該当なし検索語");

    expect(screen.getByText("条件に一致する機器はありません")).toBeInTheDocument();
    expect(screen.getByLabelText("検索")).toBeInTheDocument();
    expect(screen.getByLabelText("状態")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "+ 機器を追加" })).toHaveLength(1);
  });
});
