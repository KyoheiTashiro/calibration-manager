import { RadioGroup } from "@/components/ui/RadioGroup";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する。
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";

const typeOptions = [
  { value: "inspection", label: "点検" },
  { value: "calibration", label: "校正" },
] as const;

describe("RadioGroup", () => {
  it("legend と全選択肢が radio group としてレンダリングされる", () => {
    render(<RadioGroup label="種別" options={typeOptions} name="type" />);

    expect(screen.getByRole("group", { name: "種別" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "点検" })).toHaveAttribute("value", "inspection");
    expect(screen.getByRole("radio", { name: "校正" })).toHaveAttribute("value", "calibration");
  });

  it("required 指定時に必須マークが表示される", () => {
    render(<RadioGroup label="種別" options={typeOptions} name="type" required />);

    expect(screen.getByText("*")).toHaveClass("text-red-600");
  });

  it("ラベルクリックで選択が切り替わり onChange が呼ばれる", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<() => void>();
    render(
      <RadioGroup
        label="実施区分"
        options={typeOptions}
        name="execution"
        onChange={handleChange}
      />,
    );

    await user.click(screen.getByText("校正"));

    expect(handleChange).toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "校正" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "点検" })).not.toBeChecked();
  });

  it("同名 radio 群として排他選択になる", async () => {
    const user = userEvent.setup();
    render(<RadioGroup label="種別" options={typeOptions} name="type" />);

    await user.click(screen.getByText("点検"));
    await user.click(screen.getByText("校正"));

    expect(screen.getByRole("radio", { name: "点検" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "校正" })).toBeChecked();
  });

  it("error 指定時にエラーメッセージが表示され aria-describedby で紐付く", () => {
    render(
      <RadioGroup label="種別" options={typeOptions} name="type" error="種別を選択してください" />,
    );

    const group = screen.getByRole("group", { name: "種別" });
    const errorMessage = screen.getByText("種別を選択してください");
    expect(errorMessage).toHaveClass("text-xs", "text-red-600");
    expect(group).toHaveAttribute("aria-describedby", errorMessage.id);
    expect(group).toHaveAttribute("aria-invalid", "true");
  });
});
