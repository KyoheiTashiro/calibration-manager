import { DateField } from "@/components/ui/DateField";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

describe("DateField", () => {
  it("label が表示される", () => {
    render(<DateField label="次回期限" />);

    expect(screen.getByText("次回期限")).toBeInTheDocument();
  });

  it("required 時に赤アスタリスクが表示される", () => {
    render(<DateField label="次回期限" required />);

    expect(screen.getByText("*")).toHaveClass("text-red-600");
  });

  it("required を指定しない場合はアスタリスクが表示されない", () => {
    render(<DateField label="次回期限" />);

    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("type=date の input としてレンダリングされる", () => {
    render(<DateField label="次回期限" />);

    const input = screen.getByLabelText("次回期限");
    expect(input).toHaveAttribute("type", "date");
  });

  it("type を上書きしようとしても date のまま固定される", () => {
    render(<DateField label="次回期限" type="text" />);

    const input = screen.getByLabelText("次回期限");
    expect(input).toHaveAttribute("type", "date");
  });

  it("error 指定時にエラーメッセージが表示され aria-describedby で紐付く", () => {
    render(<DateField label="次回期限" error="必須項目です" />);

    const input = screen.getByLabelText("次回期限");
    const errorMessage = screen.getByText("必須項目です");
    expect(errorMessage).toHaveClass("text-xs", "text-red-600");
    expect(input).toHaveAttribute("aria-describedby", errorMessage.id);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("error 未指定時は aria-describedby が付かない", () => {
    render(<DateField label="次回期限" />);

    const input = screen.getByLabelText("次回期限");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("error 指定時に border-red-500 クラスが付く", () => {
    render(<DateField label="次回期限" error="必須項目です" />);

    const input = screen.getByLabelText("次回期限");
    expect(input.className).toContain("border-red-500");
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("value/onChange/ref/name 等のネイティブ props がそのまま素通しされる", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<() => void>();
    const ref = createRef<HTMLInputElement>();
    render(
      <DateField label="次回期限" name="nextDueDate" value="" onChange={handleChange} ref={ref} />,
    );

    const input = screen.getByLabelText("次回期限");
    expect(input).toHaveAttribute("name", "nextDueDate");
    expect(ref.current).toBe(input);

    await user.type(input, "2026-07-03");

    expect(handleChange).toHaveBeenCalled();
  });
});
