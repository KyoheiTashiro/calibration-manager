/**
 * EquipmentForm（/equipment/new・/equipment/:id/edit）の検証（screen-design/03-equipment-form.md）。
 * 新規登録・編集プリフィル/更新・管理番号ユニーク検証（自己除外含む）・必須エラー・
 * メーカーセレクト（フィルタ/空状態）・廃棄確認フロー・編集モードの存在しないid（リダイレクト）を扱う。
 */

import { ROUTES, equipmentDetailPath, equipmentEditPath } from "@/constants/routes";
import { EquipmentForm } from "@/features/equipment/form";
import { EQUIPMENT_STATUS, type Equipment, type Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type * as ReactRouterDomModule from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// なぜ: このテストファイルに閉じてnavigate呼び出しをスパイに差し替える。
// MemoryRouter/Route/Routes/useParams/Navigate/Link 等の実実装は importOriginal 経由で維持する
// （renderWithStore・本テストファイルの両方が実物のこれらを必要とするため）。
// なぜ .then() で繋ぐか: oxc/no-async-await（このリポジトリの規約）を避けつつ
// importOriginal（Promise）で実実装を維持したまま useNavigate だけ差し替えるため。
const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", (importOriginal) =>
  importOriginal<typeof ReactRouterDomModule>().then((actual) => ({
    ...actual,
    useNavigate: (): typeof navigateSpy => navigateSpy,
  })),
);

const mitutoyo: Vendor = {
  id: "vendor-1",
  name: "ミツトヨ",
  isManufacturer: true,
  isCalibrator: false,
};

const nonManufacturerVendor: Vendor = {
  id: "vendor-2",
  name: "校正商事",
  isManufacturer: false,
  isCalibrator: true,
};

const existingEquipment: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  model: "CD-15",
  manufacturerId: mitutoyo.id,
  location: "検査室",
  status: EQUIPMENT_STATUS.ACTIVE,
};

const otherEquipment: Equipment = {
  id: "equipment-2",
  managementNo: "EQ-002",
  name: "マイクロメータ",
  status: EQUIPMENT_STATUS.ACTIVE,
};

const renderNewForm = (): ReturnType<typeof renderWithStore> =>
  renderWithStore(<EquipmentForm />, {
    initialEntries: [ROUTES.EQUIPMENT_NEW],
    routePath: ROUTES.EQUIPMENT_NEW,
  });

const renderEditForm = (id: string): ReturnType<typeof renderWithStore> =>
  renderWithStore(<EquipmentForm />, {
    initialEntries: [equipmentEditPath(id)],
    routePath: ROUTES.EQUIPMENT_EDIT,
  });

beforeEach(() => {
  setupStoreIsolation();
  navigateSpy.mockClear();
});

describe("EquipmentForm: 新規登録", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("必須項目を入力して保存すると Equipment が作成され詳細へ遷移する", async () => {
    const user = userEvent.setup();
    renderNewForm();

    await user.type(screen.getByLabelText("管理番号", { exact: false }), "EQ-100");
    await user.type(screen.getByLabelText("機器名", { exact: false }), "トルクレンチ");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const created = Object.values(useAppStore.getState().equipment).find(
      (entry) => entry.managementNo === "EQ-100",
    );
    expect(created).toBeDefined();
    expect(created?.name).toBe("トルクレンチ");
    expect(created?.status).toBe(EQUIPMENT_STATUS.ACTIVE);
    expect(navigateSpy).toHaveBeenCalledWith(equipmentDetailPath(created?.id ?? ""));
  });
});

describe("EquipmentForm: 編集プリフィル・更新", () => {
  it("既存値がプリフィルされる", () => {
    seedStore({ equipment: { [existingEquipment.id]: existingEquipment } });
    renderEditForm(existingEquipment.id);

    expect(screen.getByLabelText("管理番号", { exact: false })).toHaveValue(
      existingEquipment.managementNo,
    );
    expect(screen.getByLabelText("機器名", { exact: false })).toHaveValue(existingEquipment.name);
    expect(screen.getByLabelText("型式")).toHaveValue(existingEquipment.model);
    expect(screen.getByLabelText("設置場所")).toHaveValue(existingEquipment.location);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("値を変更して保存するとストアが更新される", async () => {
    const user = userEvent.setup();
    // manufacturerId の存在検証(03-equipment-form.md)が保存時に走るため、参照先 Vendor も seed する
    seedStore({
      equipment: { [existingEquipment.id]: existingEquipment },
      vendors: { [mitutoyo.id]: mitutoyo },
    });
    renderEditForm(existingEquipment.id);

    const locationInput = screen.getByLabelText("設置場所");
    await user.clear(locationInput);
    await user.type(locationInput, "校正室");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(useAppStore.getState().equipment[existingEquipment.id]?.location).toBe("校正室");
    expect(navigateSpy).toHaveBeenCalledWith(equipmentDetailPath(existingEquipment.id));
  });
});

describe("EquipmentForm: 管理番号ユニーク検証", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("他の機器と重複する管理番号では保存できずエラーが表示される", async () => {
    const user = userEvent.setup();
    seedStore({
      equipment: {
        [existingEquipment.id]: existingEquipment,
        [otherEquipment.id]: otherEquipment,
      },
    });
    renderNewForm();

    await user.type(
      screen.getByLabelText("管理番号", { exact: false }),
      existingEquipment.managementNo,
    );
    await user.type(screen.getByLabelText("機器名", { exact: false }), "新しい機器");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText("この管理番号は既に使用されています")).toBeInTheDocument();
    expect(Object.keys(useAppStore.getState().equipment)).toHaveLength(2);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("編集時に自身の管理番号を変更せず再送信してもエラーにならない", async () => {
    const user = userEvent.setup();
    // manufacturerId の存在検証(03-equipment-form.md)が保存時に走るため、参照先 Vendor も seed する
    seedStore({
      equipment: {
        [existingEquipment.id]: existingEquipment,
        [otherEquipment.id]: otherEquipment,
      },
      vendors: { [mitutoyo.id]: mitutoyo },
    });
    renderEditForm(existingEquipment.id);

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.queryByText("この管理番号は既に使用されています")).not.toBeInTheDocument();
    expect(useAppStore.getState().equipment[existingEquipment.id]?.managementNo).toBe(
      existingEquipment.managementNo,
    );
    expect(navigateSpy).toHaveBeenCalledWith(equipmentDetailPath(existingEquipment.id));
  });
});

describe("EquipmentForm: 必須エラー", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("管理番号・機器名が空のまま保存すると両方のエラーが表示されストアは変化しない", async () => {
    const user = userEvent.setup();
    renderNewForm();

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText("管理番号は必須です")).toBeInTheDocument();
    expect(screen.getByText("機器名は必須です")).toBeInTheDocument();
    expect(Object.keys(useAppStore.getState().equipment)).toHaveLength(0);
  });
});

describe("EquipmentForm: メーカーセレクト", () => {
  it("isManufacturer=true の Vendor のみ選択肢に表示される", () => {
    seedStore({
      vendors: {
        [mitutoyo.id]: mitutoyo,
        [nonManufacturerVendor.id]: nonManufacturerVendor,
      },
    });
    renderNewForm();

    const select = screen.getByRole("combobox", { name: "メーカー" });
    const optionLabels = within(select)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(optionLabels).toContain(mitutoyo.name);
    expect(optionLabels).not.toContain(nonManufacturerVendor.name);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("メーカーが0件の場合は空状態文言とリンクを表示し、空のまま保存できる", async () => {
    const user = userEvent.setup();
    renderNewForm();

    expect(
      screen.getByText("メーカーが未登録です。マスタから登録してください"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "メーカー" })).not.toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", ROUTES.VENDOR_LIST);

    await user.type(screen.getByLabelText("管理番号", { exact: false }), "EQ-200");
    await user.type(screen.getByLabelText("機器名", { exact: false }), "新規機器");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const created = Object.values(useAppStore.getState().equipment).find(
      (entry) => entry.managementNo === "EQ-200",
    );
    expect(created).toBeDefined();
  });
});

describe("EquipmentForm: 廃棄ボタン", () => {
  it("新規登録モードでは廃棄にするボタンが表示されない", () => {
    renderNewForm();

    expect(screen.queryByRole("button", { name: "廃棄にする" })).not.toBeInTheDocument();
  });

  it("編集モードでは廃棄にするボタンが表示される", () => {
    seedStore({ equipment: { [existingEquipment.id]: existingEquipment } });
    renderEditForm(existingEquipment.id);

    expect(screen.getByRole("button", { name: "廃棄にする" })).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("確認ダイアログで確定すると status=retired になり詳細へ遷移する", async () => {
    const user = userEvent.setup();
    seedStore({ equipment: { [existingEquipment.id]: existingEquipment } });
    renderEditForm(existingEquipment.id);

    await user.click(screen.getByRole("button", { name: "廃棄にする" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("この機器を廃棄にしますか?")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "廃棄にする" }));

    expect(useAppStore.getState().equipment[existingEquipment.id]?.status).toBe(
      EQUIPMENT_STATUS.RETIRED,
    );
    expect(navigateSpy).toHaveBeenCalledWith(equipmentDetailPath(existingEquipment.id));
  });
});

describe("EquipmentForm: 編集モードで存在しないid", () => {
  it("一覧画面へリダイレクトする", () => {
    render(
      <MemoryRouter initialEntries={[equipmentEditPath("does-not-exist")]}>
        <Routes>
          <Route path={ROUTES.EQUIPMENT_EDIT} element={<EquipmentForm />} />
          <Route path={ROUTES.EQUIPMENT_LIST} element={<div>機器一覧（テスト用マーカー）</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("機器一覧（テスト用マーカー）")).toBeInTheDocument();
  });
});
