import { ControlledSelect } from "@/components/ui/Select";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する。
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

const OPTIONS = [
  { value: "vendorA", label: "取引先A" },
  { value: "vendorB", label: "取引先B" },
  { value: "vendorC", label: "取引先C" },
];

type FormValues = {
  vendorId?: string;
};

const Harness = ({
  defaultValues,
  onValidSubmit,
}: {
  defaultValues: FormValues;
  onValidSubmit: (values: FormValues) => void;
}): ReactElement => {
  const { control, handleSubmit } = useForm<FormValues>({ defaultValues });

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onValidSubmit)(event);
      }}
    >
      <ControlledSelect
        control={control}
        name="vendorId"
        label="取引先"
        options={OPTIONS}
        placeholder="選択してください"
      />
      <button type="submit">送信</button>
    </form>
  );
};

describe("ControlledSelect", () => {
  it("form の初期値が Select に表示される", () => {
    render(
      <Harness
        defaultValues={{ vendorId: "vendorB" }}
        onValidSubmit={vi.fn<(values: FormValues) => void>()}
      />,
    );

    expect(screen.getByRole("combobox", { name: "取引先" })).toHaveTextContent("取引先B");
  });

  it("option 選択で form の値が更新され、送信時に反映される", async () => {
    const user = userEvent.setup();
    const handleValidSubmit = vi.fn<(values: FormValues) => void>();
    render(<Harness defaultValues={{ vendorId: "" }} onValidSubmit={handleValidSubmit} />);

    await user.click(screen.getByRole("combobox", { name: "取引先" }));
    await user.click(screen.getByRole("option", { name: "取引先C" }));
    await user.click(screen.getByRole("button", { name: "送信" }));

    // なぜ第一引数のみ検証するか: RHF handleSubmit の valid コールバックは
    // (values, event) の2引数で呼ばれるため、event は無視して values のみ確認する。
    expect(handleValidSubmit).toHaveBeenCalledTimes(1);
    expect(handleValidSubmit.mock.calls[0]?.[0]).toEqual({ vendorId: "vendorC" });
  });

  it('field.value が undefined のとき value="" として扱われ placeholder が表示される', () => {
    render(<Harness defaultValues={{}} onValidSubmit={vi.fn<(values: FormValues) => void>()} />);

    expect(screen.getByRole("combobox", { name: "取引先" })).toHaveTextContent("選択してください");
  });
});
