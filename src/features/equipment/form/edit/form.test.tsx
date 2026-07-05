/**
 * EquipmentEditForm（/equipment/:id/edit）の検証（screen-design/03-equipment-form.md）。
 * 編集プリフィル/更新・管理番号ユニーク検証（自己除外含む）・廃棄確認フロー・
 * 編集モードの存在しないid（リダイレクト）を扱う。
 */

import { ROUTES, equipmentEditPath } from "@/constants/routes";
import { EquipmentEditForm } from "@/features/equipment/form/edit";
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
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

const mitutoyo: Vendor = {
  id: "vendor-1",
  name: "ミツトヨ",
  isManufacturer: true,
  isCalibrator: false,
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
const DummyEquipmentDetail = (): ReactElement => {
  const { id } = useParams();
  return <p>機器詳細:{id}</p>;
};

const renderEditForm = (id: string): void => {
  renderWithStore(
    <Routes>
      <Route path={ROUTES.EQUIPMENT_EDIT} element={<EquipmentEditForm />} />
      <Route path={ROUTES.EQUIPMENT_DETAIL} element={<DummyEquipmentDetail />} />
    </Routes>,
    { initialEntries: [equipmentEditPath(id)] },
  );
};

beforeEach(setupStoreIsolation);

describe("EquipmentEditForm: 編集プリフィル・更新", () => {
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

    // 保存(react-hook-formのasync submit)後の遷移は非同期のためfindByTextで待機する
    expect(await screen.findByText(`機器詳細:${existingEquipment.id}`)).toBeInTheDocument();
    expect(useAppStore.getState().equipment[existingEquipment.id]?.location).toBe("校正室");
  });
});

describe("EquipmentEditForm: 管理番号ユニーク検証", () => {
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

    // 保存(react-hook-formのasync submit)後の遷移は非同期のためfindByTextで待機する
    expect(await screen.findByText(`機器詳細:${existingEquipment.id}`)).toBeInTheDocument();
    expect(screen.queryByText("この管理番号は既に使用されています")).not.toBeInTheDocument();
    expect(useAppStore.getState().equipment[existingEquipment.id]?.managementNo).toBe(
      existingEquipment.managementNo,
    );
  });
});

describe("EquipmentEditForm: 廃棄ボタン", () => {
  it("編集モードでは廃棄にするボタンが表示される", () => {
    seedStore({ equipment: { [existingEquipment.id]: existingEquipment } });
    renderEditForm(existingEquipment.id);

    expect(screen.getByRole("button", { name: "廃棄にする" })).toBeInTheDocument();
  });

  it("確認ダイアログで確定すると status=retired になり詳細へ遷移する", async () => {
    const user = userEvent.setup();
    seedStore({ equipment: { [existingEquipment.id]: existingEquipment } });
    renderEditForm(existingEquipment.id);

    await user.click(screen.getByRole("button", { name: "廃棄にする" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("この機器を廃棄にしますか?")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "廃棄" }));

    // 確定後の遷移は非同期になり得るためfindByTextで待機する
    expect(await screen.findByText(`機器詳細:${existingEquipment.id}`)).toBeInTheDocument();
    expect(useAppStore.getState().equipment[existingEquipment.id]?.status).toBe(
      EQUIPMENT_STATUS.RETIRED,
    );
  });
});

describe("EquipmentEditForm: 編集モードで存在しないid", () => {
  it("一覧画面へリダイレクトする", () => {
    render(
      <MemoryRouter initialEntries={[equipmentEditPath("does-not-exist")]}>
        <Routes>
          <Route path={ROUTES.EQUIPMENT_EDIT} element={<EquipmentEditForm />} />
          <Route path={ROUTES.EQUIPMENT_LIST} element={<div>機器一覧（テスト用マーカー）</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("機器一覧（テスト用マーカー）")).toBeInTheDocument();
  });
});
