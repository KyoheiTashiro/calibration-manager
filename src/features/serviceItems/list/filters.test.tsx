/**
 * ServiceItemList: フィルタ(screen-design/05-service-item-list.md「操作」、D-022)の検証。
 * URLクエリが唯一の真実源: 初期化(?status=)・Select 操作による絞り込みと URL 反映・クリアを確認する。
 */

import { ServiceItemList } from "@/features/serviceItems/list";
import { personSuzuki, seedServiceItemList } from "@/features/serviceItems/list/listFixtures";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

/** 現在の location.search をテストから読めるように testid で露出する */
const LocationProbe = (): ReactElement => {
  const location = useLocation();
  return <span data-testid="search">{location.search}</span>;
};

const renderList = (search = ""): ReturnType<typeof renderWithStore> =>
  renderWithStore(
    <>
      <ServiceItemList />
      <LocationProbe />
    </>,
    { initialEntries: [`/service-items${search}`] },
  );

const searchValue = (): string => screen.getByTestId("search").textContent;
const dataRowCount = (): number => screen.getAllByRole("row").length - 1;

beforeEach(() => {
  setupStoreIsolation();
  seedServiceItemList();
});

describe("ServiceItemList: フィルタ", () => {
  it("?status=overdue で初期化すると overdue の行だけを表示する", () => {
    renderList("?status=overdue");

    expect(screen.getByRole("row", { name: /年次校正/u })).toBeInTheDocument();
    expect(screen.queryByText("半期校正")).not.toBeInTheDocument();
    expect(screen.queryByText("月次点検")).not.toBeInTheDocument();
  });

  it("担当セレクトは name 昇順で無効者に「(無効)」注記を付ける", () => {
    renderList();

    const personSelect = screen.getByLabelText("担当");
    expect(personSelect).toHaveTextContent(`${personSuzuki.name}(無効)`);
  });

  it("種別セレクトを変更すると行が絞られ URL に type が反映される", async () => {
    const user = userEvent.setup();
    renderList();
    expect(dataRowCount()).toBe(3);

    await user.selectOptions(screen.getByLabelText("種別"), "点検");

    expect(dataRowCount()).toBe(1);
    expect(screen.getByRole("row", { name: /月次点検/u })).toBeInTheDocument();
    expect(searchValue()).toContain("type=inspection");
  });

  it("「全て」を選び直すと該当クエリが URL から除去される", async () => {
    const user = userEvent.setup();
    renderList("?type=inspection");
    expect(dataRowCount()).toBe(1);

    await user.selectOptions(screen.getByLabelText("種別"), "全て");

    expect(dataRowCount()).toBe(3);
    expect(searchValue()).not.toContain("type=");
  });

  it("クリアで全フィルタが外れ全行が復帰し URL クエリが空になる", async () => {
    const user = userEvent.setup();
    renderList("?status=overdue");
    expect(dataRowCount()).toBe(1);

    await user.click(screen.getByRole("button", { name: "クリア" }));

    expect(dataRowCount()).toBe(3);
    expect(searchValue()).toBe("");
  });

  it("クリアはフィルタ以外の未知クエリも含めて全除去する(D-022)", async () => {
    const user = userEvent.setup();
    // 未知パラメータ(page)をフィルタと併存させ、クリアが全クエリを消すことを確認する
    renderList("?status=overdue&page=2");
    expect(dataRowCount()).toBe(1);

    await user.click(screen.getByRole("button", { name: "クリア" }));

    expect(dataRowCount()).toBe(3);
    expect(searchValue()).toBe("");
  });
});
