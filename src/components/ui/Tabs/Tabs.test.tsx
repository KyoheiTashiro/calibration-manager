import { Tabs } from "@/components/ui/Tabs";
import { fireEvent, render, screen } from "@testing-library/react";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";

const TABS = [
  { key: "detail", label: "詳細" },
  { key: "history", label: "履歴" },
] as const;

describe("Tabs", () => {
  it("ルート要素に role=tablist が付与される", () => {
    render(<Tabs tabs={TABS} activeKey="detail" onChange={vi.fn<() => void>()} />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("各タブに role=tab が付与される", () => {
    render(<Tabs tabs={TABS} activeKey="detail" onChange={vi.fn<() => void>()} />);

    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("activeKey に一致するタブは aria-selected=true になる", () => {
    render(<Tabs tabs={TABS} activeKey="detail" onChange={vi.fn<() => void>()} />);

    const activeTab = screen.getByRole("tab", { name: "詳細" });
    expect(activeTab).toHaveAttribute("aria-selected", "true");
  });

  it("activeKey に一致しないタブは aria-selected=false になる", () => {
    render(<Tabs tabs={TABS} activeKey="detail" onChange={vi.fn<() => void>()} />);

    const inactiveTab = screen.getByRole("tab", { name: "履歴" });
    expect(inactiveTab).toHaveAttribute("aria-selected", "false");
  });

  it("アクティブなタブには border-primary text-primary クラスが付与される", () => {
    render(<Tabs tabs={TABS} activeKey="detail" onChange={vi.fn<() => void>()} />);

    const activeTab = screen.getByRole("tab", { name: "詳細" });
    expect(activeTab.className).toContain("border-primary");
    expect(activeTab.className).toContain("text-primary");
  });

  it("非アクティブなタブには中立色のクラスが付与される", () => {
    render(<Tabs tabs={TABS} activeKey="detail" onChange={vi.fn<() => void>()} />);

    const inactiveTab = screen.getByRole("tab", { name: "履歴" });
    expect(inactiveTab.className).toContain("border-transparent");
    expect(inactiveTab.className).toContain("text-slate-500");
  });

  it("タブをクリックすると onChange が対象タブの key で呼ばれる", () => {
    const handleChange = vi.fn<() => void>();
    render(<Tabs tabs={TABS} activeKey="detail" onChange={handleChange} />);

    fireEvent.click(screen.getByRole("tab", { name: "履歴" }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith("history");
  });

  it("タブ要素は type=button になる", () => {
    render(<Tabs tabs={TABS} activeKey="detail" onChange={vi.fn<() => void>()} />);

    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).toHaveAttribute("type", "button");
    }
  });
});
