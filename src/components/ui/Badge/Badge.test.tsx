import { Badge } from "@/components/ui/Badge";
import { render, screen } from "@testing-library/react";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

describe("Badge", () => {
  it("children を表示する", () => {
    render(<Badge>正常</Badge>);

    expect(screen.getByText("正常")).toBeInTheDocument();
  });

  it("className が基調クラスに追加で反映される", () => {
    render(<Badge className="bg-green-100 text-green-800">正常</Badge>);

    const badge = screen.getByText("正常");
    expect(badge.className).toContain("inline-flex");
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-800");
  });
});
