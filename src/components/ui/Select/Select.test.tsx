import { Select } from "@/components/ui/Select";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

const OPTIONS = [
  { value: "vendorA", label: "取引先A" },
  { value: "vendorB", label: "取引先B" },
];

describe("Select", () => {
  it("label が表示される", () => {
    render(<Select label="取引先" options={OPTIONS} />);

    expect(screen.getByText("取引先")).toBeInTheDocument();
  });

  it("required 時に赤アスタリスクが表示される", () => {
    render(<Select label="取引先" options={OPTIONS} required />);

    expect(screen.getByText("*")).toHaveClass("text-red-600");
  });

  it("required を指定しない場合はアスタリスクが表示されない", () => {
    render(<Select label="取引先" options={OPTIONS} />);

    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("error 指定時にエラーメッセージが表示され aria-describedby で紐付く", () => {
    render(<Select label="取引先" options={OPTIONS} error="必須項目です" />);

    const select = screen.getByRole("combobox", { name: "取引先" });
    const errorMessage = screen.getByText("必須項目です");
    expect(errorMessage).toHaveClass("text-xs", "text-red-600");
    expect(select).toHaveAttribute("aria-describedby", errorMessage.id);
    expect(select).toHaveAttribute("aria-invalid", "true");
  });

  it("error 未指定時は aria-describedby が付かない", () => {
    render(<Select label="取引先" options={OPTIONS} />);

    const select = screen.getByRole("combobox", { name: "取引先" });
    expect(select).not.toHaveAttribute("aria-describedby");
    expect(select).not.toHaveAttribute("aria-invalid");
  });

  it("error 指定時に border-red-500 クラスが付く", () => {
    render(<Select label="取引先" options={OPTIONS} error="必須項目です" />);

    const select = screen.getByRole("combobox", { name: "取引先" });
    expect(select.className).toContain("border-red-500");
  });

  it("placeholder 指定時に空 option が先頭にある", () => {
    render(<Select label="取引先" options={OPTIONS} placeholder="選択してください" />);

    const select = screen.getByRole("combobox", { name: "取引先" });
    const optionElements = select.querySelectorAll("option");
    expect(optionElements[0]).toHaveValue("");
    expect(optionElements[0]).toHaveTextContent("選択してください");
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("name/onChange/ref 等のネイティブ props がそのまま素通しされる", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<() => void>();
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select label="取引先" options={OPTIONS} name="vendorId" onChange={handleChange} ref={ref} />,
    );

    const select = screen.getByRole("combobox", { name: "取引先" });
    expect(select).toHaveAttribute("name", "vendorId");
    expect(ref.current).toBe(select);

    await user.selectOptions(select, "vendorB");

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(select).toHaveValue("vendorB");
  });
});
