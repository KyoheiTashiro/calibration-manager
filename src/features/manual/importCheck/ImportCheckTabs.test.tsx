import { dispatchSearchReveal } from "@/features/manual/search/revealEvent";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { ImportCheckTabs } from "./ImportCheckTabs";

/** 全タブが hidden で同時に DOM 上に存在するため、アサーションはアクティブパネルへ都度スコープする(D-073) */
const getPanel = (kind: string): HTMLElement => {
  const panel = document.querySelector<HTMLElement>(`[data-csv-entity-kind="${kind}"]`);
  if (panel === null) {
    throw new Error(`パネルが見つかりません: ${kind}`);
  }
  return panel;
};

describe("ImportCheckTabs", () => {
  it("タブが推奨インポート順(参照される側が先)で並ぶ", () => {
    render(<ImportCheckTabs />);

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "メーカー/取引先",
      "担当者",
      "機器",
      "点検校正項目",
      "点検校正外部案件",
      "実施記録",
      "通知",
    ]);
  });

  it("初期表示でメーカー/取引先の項目チェック内容(isManufacturer)が表示される", () => {
    render(<ImportCheckTabs />);

    expect(screen.getByText("isManufacturer")).toBeInTheDocument();
    expect(
      screen.getAllByText("空でない文字列。ファイル内で重複しないこと", { exact: false }).length,
    ).toBeGreaterThan(0);
  });

  it("見出しは「列」を使わず、各項目に画面での名前が表示される", () => {
    render(<ImportCheckTabs />);

    // 全タブが hidden で同時に DOM 上へ存在するため(D-073)、見出しの検証は
    // 初期表示中のメーカー/取引先パネルにスコープする(全パネルに同じ見出しが並ぶため件数は変わらない強さ)
    const vendorsPanel = within(getPanel("vendors"));
    expect(vendorsPanel.getByRole("columnheader", { name: "項目名" })).toBeInTheDocument();
    expect(vendorsPanel.getByRole("columnheader", { name: "画面での名前" })).toBeInTheDocument();
    expect(vendorsPanel.queryByRole("columnheader", { name: "列" })).not.toBeInTheDocument();
    expect(vendorsPanel.getByText("窓口担当者", { selector: "td" })).toBeInTheDocument();
  });

  it("必須項目は○の有無で表現される(必須は○、任意は空欄)", () => {
    render(<ImportCheckTabs />);

    // 全タブが同時に DOM 上へ存在するため(D-073)、vendors パネルにスコープして数える
    const vendorsPanel = within(getPanel("vendors"));
    // vendors: 必須4列(id/name/isManufacturer/isCalibrator)に○、任意5列は空欄
    expect(vendorsPanel.getAllByText("○")).toHaveLength(4);
    expect(vendorsPanel.queryByText("必須", { selector: "td" })).not.toBeInTheDocument();
    expect(vendorsPanel.queryByText("任意", { selector: "td" })).not.toBeInTheDocument();
  });

  it("別タブ(機器)をクリックすると表の内容が切り替わる", () => {
    render(<ImportCheckTabs />);

    fireEvent.click(screen.getByRole("tab", { name: "機器" }));

    // hidden パネルは unmount されず DOM に残るため(D-073)、存在ではなく可視性で切替を検証する
    expect(screen.getByText("managementNo")).toBeVisible();
    expect(screen.getByText("isManufacturer")).not.toBeVisible();
  });

  it("非アクティブタブの表も hidden 状態で DOM に保持される(D-073)", () => {
    render(<ImportCheckTabs />);

    // 初期表示は「メーカー/取引先」がアクティブ。「機器」タブ(managementNo)は
    // hidden のまま DOM に存在し、検索対象になる(D-072/D-073)
    expect(screen.getByText("managementNo")).toBeInTheDocument();
    expect(screen.getByText("managementNo")).not.toBeVisible();
  });

  it("hidden パネルで manual-search-reveal イベントが発火するとそのタブに切り替わる", async () => {
    render(<ImportCheckTabs />);

    dispatchSearchReveal(getPanel("equipment"));

    // ネイティブ dispatchEvent 経由の state 更新のため、反映を waitFor で待つ
    await waitFor(() => {
      expect(screen.getByText("managementNo")).toBeVisible();
    });
    expect(screen.getByRole("tab", { name: "機器" })).toHaveAttribute("aria-selected", "true");
  });
});
