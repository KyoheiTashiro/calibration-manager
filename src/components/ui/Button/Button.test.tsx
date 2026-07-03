import { Button } from "@/components/ui/Button";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";

describe("Button", () => {
  it("children を表示し既定値では type=button になる", () => {
    render(<Button>保存</Button>);

    const button = screen.getByRole("button", { name: "保存" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("variant=primary の既定クラスが付与される", () => {
    render(<Button>保存</Button>);

    const button = screen.getByRole("button", { name: "保存" });
    expect(button.className).toContain("bg-primary");
  });

  it("variant=secondary のクラスが付与される", () => {
    render(<Button variant="secondary">キャンセル</Button>);

    const button = screen.getByRole("button", { name: "キャンセル" });
    expect(button.className).toContain("border-slate-300");
  });

  it("variant=danger のクラスが付与される", () => {
    render(<Button variant="danger">削除</Button>);

    const button = screen.getByRole("button", { name: "削除" });
    expect(button.className).toContain("bg-danger");
  });

  it("size=md では h-9 クラスが付与される", () => {
    render(<Button size="md">保存</Button>);

    const button = screen.getByRole("button", { name: "保存" });
    expect(button.className).toContain("h-9");
  });

  it("size=sm では h-8 クラスが付与される", () => {
    render(<Button size="sm">編集</Button>);

    const button = screen.getByRole("button", { name: "編集" });
    expect(button.className).toContain("h-8");
  });

  // なぜ async/await ではなく then チェーンか: oxc/no-async-await（restrictionカテゴリ、全カテゴリerror
  // 設定によりプロジェクト全体で有効）が async キーワードを禁止するため、Promise チェーンで待機する。
  // it に返した Promise は vitest が自動で await する。
  it("クリック時に onClick が呼ばれる", () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>保存</Button>);

    return user.click(screen.getByRole("button", { name: "保存" })).then(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it("disabled 時はクリックしても onClick が呼ばれない", () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        保存
      </Button>,
    );

    return user.click(screen.getByRole("button", { name: "保存" })).then(() => {
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
