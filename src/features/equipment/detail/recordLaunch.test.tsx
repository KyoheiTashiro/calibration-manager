/**
 * EquipmentDetail: 実施記録登録モーダル(RecordModal)の起動結節点の検証
 * (screen-design/04-equipment-detail.md「操作・アクション」/ 07-record-modal.md)。
 * 行「記録」ボタンで対象項目がプリセットされたモーダルが開き、登録で実施記録が増えることを扱う。
 * モーダル自体の入力・検証は RecordModal.test.tsx の責務。
 */

import { ROUTES, equipmentDetailPath } from "@/constants/routes";
import { EquipmentDetail } from "@/features/equipment/detail";
import {
  equipmentFull,
  serviceItemExternal,
  seedEquipmentFullServiceItemsAndRecords,
  seedEquipmentFullMasters,
} from "@/features/equipment/detail/detailFixtures";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

/** 項目テーブル(1つ目のtable)の行を取得する。項目名は実施記録テーブルにも出現するためスコープする */
const getServiceItemRow = (name: RegExp): HTMLElement => {
  const serviceItemTable = screen.getAllByRole("table").at(0);
  if (!serviceItemTable) throw new Error("項目テーブルが見つかりません");
  return within(serviceItemTable).getByRole("row", { name });
};

/** 実施記録テーブル(2つ目のtable)のデータ行を返す */
const getHistoryRows = (): HTMLElement[] => {
  const historyTable = screen.getAllByRole("table").at(1);
  if (!historyTable) throw new Error("実施記録テーブルが見つかりません");
  const [, ...dataRows] = within(historyTable).getAllByRole("row");
  return dataRows;
};

beforeEach(() => {
  setupStoreIsolation();
  seedEquipmentFullMasters();
  seedEquipmentFullServiceItemsAndRecords();
});

describe("EquipmentDetail: RecordModal起動", () => {
  it("行の「記録」で対象項目がプリセットされたモーダルが開く", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(within(getServiceItemRow(/年次校正/u)).getByRole("button", { name: "記録" }));

    const dialogElement = getOpenDialog("実施記録を登録");
    expect(
      within(dialogElement).getByText(`対象:EQ-001 ノギス / ${serviceItemExternal.name}`),
    ).toBeInTheDocument();
  });

  it("登録すると実施記録テーブルへ行が増える", async () => {
    const user = userEvent.setup();
    renderDetail();

    const recordsBefore = Object.keys(useAppStore.getState().records).length;
    const historyRowsBefore = getHistoryRows().length;

    await user.click(within(getServiceItemRow(/年次校正/u)).getByRole("button", { name: "記録" }));
    const dialogElement = getOpenDialog("実施記録を登録");
    await user.click(within(dialogElement).getByLabelText("合格"));
    await user.click(within(dialogElement).getByRole("button", { name: "保存" }));

    expect(getHistoryRows()).toHaveLength(historyRowsBefore + 1);
    expect(Object.keys(useAppStore.getState().records)).toHaveLength(recordsBefore + 1);
  });
});
