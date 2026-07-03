import { Checkbox } from "@/components/ui/Checkbox";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("Checkbox", () => {
  it("label が表示され type=checkbox としてレンダリングされる", () => {
    render(<Checkbox label="メーカー" />);

    expect(screen.getByRole("checkbox", { name: "メーカー" })).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("ラベルクリックでチェック状態が切り替わり onChange が呼ばれる", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Checkbox label="校正業者" onChange={handleChange} />);

    await user.click(screen.getByText("校正業者"));

    expect(handleChange).toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "校正業者" })).toBeChecked();
  });

  it("error 指定時にエラーメッセージが表示され aria-describedby で紐付く", () => {
    render(<Checkbox label="メーカー" error="選択が不正です" />);

    const checkbox = screen.getByRole("checkbox", { name: "メーカー" });
    const errorMessage = screen.getByText("選択が不正です");
    expect(errorMessage).toHaveClass("text-xs", "text-red-600");
    expect(checkbox).toHaveAttribute("aria-describedby", errorMessage.id);
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
  });

  it("error 未指定時は aria-describedby / aria-invalid が付かない", () => {
    render(<Checkbox label="メーカー" />);

    const checkbox = screen.getByRole("checkbox", { name: "メーカー" });
    expect(checkbox).not.toHaveAttribute("aria-describedby");
    expect(checkbox).not.toHaveAttribute("aria-invalid");
  });

  it("name/ref 等のネイティブ props がそのまま素通しされる", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox label="メーカー" name="isManufacturer" ref={ref} />);

    const checkbox = screen.getByRole("checkbox", { name: "メーカー" });
    expect(checkbox).toHaveAttribute("name", "isManufacturer");
    expect(ref.current).toBe(checkbox);
  });
});
