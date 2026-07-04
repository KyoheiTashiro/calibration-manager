import { INSPECTION_ITEM_STATUS } from "@/domain/inspectionItemStatus";
import { statusBadgeLabel } from "@/domain/statusBadge";
import { Manual } from "@/features/manual";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

describe("Manual", () => {
  beforeEach(setupStoreIsolation);

  it("見出し「利用マニュアル」(h1)が表示される", () => {
    renderWithStore(<Manual />);

    expect(screen.getByRole("heading", { level: 1, name: "利用マニュアル" })).toBeInTheDocument();
  });

  it.each([
    "ご利用にあたって",
    "基本の流れ",
    "ステータスの見方",
    "期限と発注推奨日の計算",
    "各画面の説明",
    "バックアップと復元",
  ])("見出し「%s」(h2)が表示される", (heading) => {
    renderWithStore(<Manual />);

    expect(screen.getByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
  });

  it("全ステータスのバッジ日本語ラベルが表示される(INSPECTION_ITEM_STATUS定義順=優先度順)", () => {
    renderWithStore(<Manual />);

    for (const status of Object.values(INSPECTION_ITEM_STATUS)) {
      expect(screen.getAllByText(statusBadgeLabel(status)).length).toBeGreaterThan(0);
    }
  });

  it("主要画面へのリンクが存在する", () => {
    renderWithStore(<Manual />);

    expect(screen.getByRole("link", { name: "ダッシュボード" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "機器を追加" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "機器一覧" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "機器一覧・機器詳細" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "通知" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "設定" })).toBeInTheDocument();

    expect(screen.getAllByRole("link", { name: "点検校正項目一覧" }).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getAllByRole("link", { name: "点検校正外部案件" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link", { name: "メーカー/取引先" }).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getAllByRole("link", { name: "担当者" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link", { name: "設定画面" }).length).toBeGreaterThanOrEqual(2);
  });
});
