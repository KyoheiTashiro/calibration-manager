/**
 * EquipmentCreateForm（/equipment/create）の検証（screen-design/03-equipment-form.md）。
 * 新規登録・管理番号ユニーク検証・必須エラー・メーカーセレクト（フィルタ/空状態）・
 * 廃棄にするボタン非表示を扱う。
 */

import { ROUTES } from "@/constants/routes";
import { EquipmentCreateForm } from "@/features/equipment/form/create";
import { EQUIPMENT_STATUS, type Equipment, type Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

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

/** 遷移先確認用ダミー: 機器詳細(:id を表示) */
// oxlint-disable-next-line react/no-multi-comp -- テスト内の遷移先ダミーは複数の別画面を模すため同一ファイルに並べる
const DummyEquipmentDetail = (): ReactElement => {
  const { id } = useParams();
  return <p>機器詳細:{id}</p>;
};

const renderCreateForm = (): void => {
  renderWithStore(
    <Routes>
      <Route path={ROUTES.EQUIPMENT_CREATE} element={<EquipmentCreateForm />} />
      <Route path={ROUTES.EQUIPMENT_DETAIL} element={<DummyEquipmentDetail />} />
    </Routes>,
    { initialEntries: [ROUTES.EQUIPMENT_CREATE] },
  );
};

beforeEach(setupStoreIsolation);

describe("EquipmentCreateForm: 新規登録", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("必須項目を入力して保存すると Equipment が作成され詳細へ遷移する", async () => {
    const user = userEvent.setup();
    renderCreateForm();

    await user.type(screen.getByLabelText("管理番号", { exact: false }), "EQ-100");
    await user.type(screen.getByLabelText("機器名", { exact: false }), "トルクレンチ");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const created = Object.values(useAppStore.getState().equipment).find(
      (entry) => entry.managementNo === "EQ-100",
    );
    if (!created) throw new Error("Equipment が作成されていません");
    expect(created.name).toBe("トルクレンチ");
    expect(created.status).toBe(EQUIPMENT_STATUS.ACTIVE);
    expect(screen.getByText(`機器詳細:${created.id}`)).toBeInTheDocument();
  });
});

describe("EquipmentCreateForm: 管理番号ユニーク検証", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("他の機器と重複する管理番号では保存できずエラーが表示される", async () => {
    const user = userEvent.setup();
    seedStore({
      equipment: {
        [existingEquipment.id]: existingEquipment,
        [otherEquipment.id]: otherEquipment,
      },
    });
    renderCreateForm();

    await user.type(
      screen.getByLabelText("管理番号", { exact: false }),
      existingEquipment.managementNo,
    );
    await user.type(screen.getByLabelText("機器名", { exact: false }), "新しい機器");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText("この管理番号は既に使用されています")).toBeInTheDocument();
    expect(Object.keys(useAppStore.getState().equipment)).toHaveLength(2);
  });
});

describe("EquipmentCreateForm: 必須エラー", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("管理番号・機器名が空のまま保存すると両方のエラーが表示されストアは変化しない", async () => {
    const user = userEvent.setup();
    renderCreateForm();

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText("管理番号は必須です")).toBeInTheDocument();
    expect(screen.getByText("機器名は必須です")).toBeInTheDocument();
    expect(Object.keys(useAppStore.getState().equipment)).toHaveLength(0);
  });
});

describe("EquipmentCreateForm: メーカーセレクト", () => {
  it("isManufacturer=true の Vendor のみ選択肢に表示される", () => {
    seedStore({
      vendors: {
        [mitutoyo.id]: mitutoyo,
        [nonManufacturerVendor.id]: nonManufacturerVendor,
      },
    });
    renderCreateForm();

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
    renderCreateForm();

    expect(
      screen.getByText("メーカーが未登録です。マスタから追加してください"),
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

describe("EquipmentCreateForm: 廃棄ボタン", () => {
  it("新規登録モードでは廃棄にするボタンが表示されない", () => {
    renderCreateForm();

    expect(screen.queryByRole("button", { name: "廃棄にする" })).not.toBeInTheDocument();
  });
});
