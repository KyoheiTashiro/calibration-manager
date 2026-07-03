/**
 * EquipmentDetail: 項目編集モーダル(InspectionItemModal)の起動結節点の検証
 * (screen-design/04-equipment-detail.md「操作・アクション」)。
 * 「+ 項目を追加」=新規モード(equipmentIdプリセット)、行「編集」=編集モード(プリフィル)。
 * モーダル自体の入力・検証は InspectionItemModal.test.tsx / InspectionItemModal.edit.test.tsx の責務。
 * ファイル分割の理由は index.test.tsx 参照。
 */

import { ROUTES, equipmentDetailPath } from "@/constants/routes";
import { EquipmentDetail } from "@/features/equipment/detail";
import {
  equipmentFull,
  inspectionItemExternal,
  seedEquipmentFullInspectionItemsAndRecords,
  seedEquipmentFullMasters,
} from "@/features/equipment/detail/detailFixtures";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const renderDetail = (): ReturnType<typeof renderWithStore> =>
  renderWithStore(<EquipmentDetail />, {
    initialEntries: [equipmentDetailPath(equipmentFull.id)],
    routePath: ROUTES.EQUIPMENT_DETAIL,
  });

/** モーダルタイトルからdialog要素を特定し、開いていることを検証して返す */
const getOpenDialog = (title: string): HTMLElement => {
  const dialogElement = screen.getByText(title).closest("dialog");
  if (!dialogElement) throw new Error("dialog要素が見つかりません");
  expect(dialogElement).toHaveAttribute("open");
  return dialogElement;
};

/**
 * 項目テーブル(1つ目のtable)の行を取得する。項目名は実施履歴テーブルの行にも
 * 出現するため、screen 全体ではなく項目テーブル内にスコープして曖昧マッチを避ける。
 */
const getInspectionItemRow = (name: RegExp): HTMLElement => {
  const [inspectionItemTable] = screen.getAllByRole("table");
  if (!inspectionItemTable) throw new Error("項目テーブルが見つかりません");
  return within(inspectionItemTable).getByRole("row", { name });
};

beforeEach(() => {
  setupStoreIsolation();
  seedEquipmentFullMasters();
  seedEquipmentFullInspectionItemsAndRecords();
});

describe("EquipmentDetail: InspectionItemModal起動", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("「+ 項目を追加」で新規モードのモーダルが開き、対象機器がプリセットされる", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole("button", { name: "+ 項目を追加" }));

    const dialogElement = getOpenDialog("点検校正項目を追加");
    expect(within(dialogElement).getByText("EQ-001 ノギス")).toBeInTheDocument();
    expect(within(dialogElement).getByLabelText("項目名", { exact: false })).toHaveValue("");
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("行の「編集」で編集モードのモーダルが開き、既存値がプリフィルされる", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(within(getInspectionItemRow(/年次校正/u)).getByRole("button", { name: "編集" }));

    const dialogElement = getOpenDialog("点検校正項目を編集");
    expect(within(dialogElement).getByLabelText("項目名", { exact: false })).toHaveValue(
      inspectionItemExternal.name,
    );
    expect(within(dialogElement).getByLabelText("外部")).toBeChecked();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("モーダルを閉じると再度「+ 項目を追加」で新規モードとして開き直せる", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(within(getInspectionItemRow(/年次校正/u)).getByRole("button", { name: "編集" }));
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    await user.click(screen.getByRole("button", { name: "+ 項目を追加" }));

    const dialogElement = getOpenDialog("点検校正項目を追加");
    expect(within(dialogElement).getByLabelText("項目名", { exact: false })).toHaveValue("");
  });
});
