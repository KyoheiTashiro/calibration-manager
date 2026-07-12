import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { ImportCheckTabs } from "./ImportCheckTabs";

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

    expect(screen.getByRole("columnheader", { name: "項目名" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "画面での名前" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "列" })).not.toBeInTheDocument();
    expect(screen.getByText("窓口担当者", { selector: "td" })).toBeInTheDocument();
  });

  it("必須項目は○の有無で表現される(必須は○、任意は空欄)", () => {
    render(<ImportCheckTabs />);

    // vendors: 必須4列(id/name/isManufacturer/isCalibrator)に○、任意5列は空欄
    expect(screen.getAllByText("○")).toHaveLength(4);
    expect(screen.queryByText("必須", { selector: "td" })).not.toBeInTheDocument();
    expect(screen.queryByText("任意", { selector: "td" })).not.toBeInTheDocument();
  });

  it("別タブ(機器)をクリックすると表の内容が切り替わる", () => {
    render(<ImportCheckTabs />);

    fireEvent.click(screen.getByRole("tab", { name: "機器" }));

    expect(screen.getByText("managementNo")).toBeInTheDocument();
    expect(screen.queryByText("isManufacturer")).not.toBeInTheDocument();
  });
});
