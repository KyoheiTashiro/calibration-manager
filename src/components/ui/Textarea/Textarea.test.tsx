import { Textarea } from "@/components/ui/Textarea";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("Textarea", () => {
  it("label が表示される", () => {
    render(<Textarea label="備考" />);

    expect(screen.getByText("備考")).toBeInTheDocument();
  });

  it("required 時に赤アスタリスクが表示される", () => {
    render(<Textarea label="備考" required />);

    expect(screen.getByText("*")).toHaveClass("text-red-600");
  });

  it("textarea としてレンダリングされる", () => {
    render(<Textarea label="備考" />);

    expect(screen.getByLabelText("備考").tagName).toBe("TEXTAREA");
  });

  it("error 指定時にエラーメッセージが表示され aria-describedby で紐付く", () => {
    render(<Textarea label="備考" error="備考は必須です" />);

    const textarea = screen.getByLabelText("備考");
    const errorMessage = screen.getByText("備考は必須です");
    expect(errorMessage).toHaveClass("text-xs", "text-red-600");
    expect(textarea).toHaveAttribute("aria-describedby", errorMessage.id);
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea.className).toContain("border-red-500");
  });

  it("error 未指定時は aria-describedby / aria-invalid が付かない", () => {
    render(<Textarea label="備考" />);

    const textarea = screen.getByLabelText("備考");
    expect(textarea).not.toHaveAttribute("aria-describedby");
    expect(textarea).not.toHaveAttribute("aria-invalid");
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("value/onChange/ref/name 等のネイティブ props がそのまま素通しされる", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea label="備考" name="note" value="" onChange={handleChange} ref={ref} />);

    const textarea = screen.getByLabelText("備考");
    expect(textarea).toHaveAttribute("name", "note");
    expect(ref.current).toBe(textarea);

    await user.type(textarea, "テストメモ");

    expect(handleChange).toHaveBeenCalled();
  });
});
