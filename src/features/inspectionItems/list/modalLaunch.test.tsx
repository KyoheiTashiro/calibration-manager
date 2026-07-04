/**
 * InspectionItemList: 行アクションからのモーダル起動結節点の検証(screen-design/05-inspection-item-list.md「操作」)。
 * [記録]→RecordModal / [案件]→OrderModal / [編集]→InspectionItemModal が正しい対象で開くことを確認する。
 * モーダル内部の入力・検証は各モーダルの単体テストの責務。
 */

import { InspectionItemList } from "@/features/inspectionItems/list";
import {
  inspectionItemExternalOverdue,
  seedInspectionItemList,
} from "@/features/inspectionItems/list/listFixtures";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const renderList = (): ReturnType<typeof renderWithStore> =>
  renderWithStore(<InspectionItemList />, { initialEntries: ["/inspection-items"] });

/** モーダルタイトルから dialog を特定し、開いていることを検証して返す */
const getOpenDialog = (title: string): HTMLElement => {
  const dialogElement = screen.getByText(title).closest("dialog");
  if (!dialogElement) throw new Error("dialog要素が見つかりません");
  expect(dialogElement).toHaveAttribute("open");
  return dialogElement;
};

/** 対象行(年次校正)の指定ボタンを押す */
// oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
const clickRowAction = async (buttonName: string): Promise<void> => {
  const user = userEvent.setup();
  const row = screen.getByRole("row", { name: /年次校正/u });
  await user.click(within(row).getByRole("button", { name: buttonName }));
};

beforeEach(() => {
  setupStoreIsolation();
  seedInspectionItemList();
});

describe("InspectionItemList: モーダル起動", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("[記録]で対象項目の RecordModal が開く", async () => {
    renderList();
    await clickRowAction("記録");

    const dialogElement = getOpenDialog("実施記録を登録");
    expect(within(dialogElement).getByText(/年次校正/u)).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("[案件]で対象項目の OrderModal が開く", async () => {
    renderList();
    await clickRowAction("案件");

    const dialogElement = getOpenDialog("点検校正外部案件を追加");
    expect(within(dialogElement).getByText(/年次校正/u)).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("[編集]で対象項目がプリフィルされた InspectionItemModal が開く", async () => {
    renderList();
    await clickRowAction("編集");

    const dialogElement = getOpenDialog("点検校正項目を編集");
    expect(within(dialogElement).getByLabelText("項目名", { exact: false })).toHaveValue(
      inspectionItemExternalOverdue.name,
    );
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("モーダルを閉じると起動 state がリセットされ再度開き直せる", async () => {
    const user = userEvent.setup();
    renderList();

    await clickRowAction("編集");
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByText("点検校正項目を編集")).not.toBeInTheDocument();

    await clickRowAction("記録");
    expect(getOpenDialog("実施記録を登録")).toBeInTheDocument();
  });
});
