import { TextField } from "@/components/ui/TextField";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("TextField", () => {
  it("label が表示される", () => {
    render(<TextField label="名称" />);

    expect(screen.getByText("名称")).toBeInTheDocument();
  });

  it("required 時に赤アスタリスクが表示される", () => {
    render(<TextField label="名称" required />);

    expect(screen.getByText("*")).toHaveClass("text-red-600");
  });

  it("既定では type=text の input としてレンダリングされる", () => {
    render(<TextField label="名称" />);

    expect(screen.getByLabelText("名称")).toHaveAttribute("type", "text");
  });

  it("type を上書きできる（number 等）", () => {
    render(<TextField label="標準納期" type="number" />);

    // なぜ getByRole か: type=number は Testing Library 上 spinbutton ロールになる
    expect(screen.getByRole("spinbutton", { name: "標準納期" })).toHaveAttribute("type", "number");
  });

  it("error 指定時にエラーメッセージが表示され aria-describedby で紐付く", () => {
    render(<TextField label="名称" error="名称は必須です" />);

    const input = screen.getByLabelText("名称");
    const errorMessage = screen.getByText("名称は必須です");
    expect(errorMessage).toHaveClass("text-xs", "text-red-600");
    expect(input).toHaveAttribute("aria-describedby", errorMessage.id);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toContain("border-red-500");
  });

  it("error 未指定時は aria-describedby / aria-invalid が付かない", () => {
    render(<TextField label="名称" />);

    const input = screen.getByLabelText("名称");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("value/onChange/ref/name 等のネイティブ props がそのまま素通しされる", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const ref = createRef<HTMLInputElement>();
    render(<TextField label="名称" name="name" value="" onChange={handleChange} ref={ref} />);

    const input = screen.getByLabelText("名称");
    expect(input).toHaveAttribute("name", "name");
    expect(ref.current).toBe(input);

    await user.type(input, "ミツトヨ");

    expect(handleChange).toHaveBeenCalled();
  });
});
