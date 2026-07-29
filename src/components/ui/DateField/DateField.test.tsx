import { DateField } from "@/components/ui/DateField";
import type * as TimeUtils from "@/utils/time";
import { render, screen } from "@testing-library/react";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する。
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { createRef, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

// なぜ todayIsoDate をモックするか: 「今日」ボタンや空値オープン時の初期カーソルは
// 実行時の実日付に依存する。vi.useFakeTimers + userEvent の組み合わせは
// タイムアウトを起こしやすいため、日付ユーティリティ側を固定値に差し替えて決定的にする。
vi.mock("@/utils/time", async (importOriginal): Promise<typeof TimeUtils> => {
  const actual = await importOriginal<typeof TimeUtils>();
  return { ...actual, todayIsoDate: () => "2026-07-15" };
});

type RhfHarnessValues = { dueDate: string };

const RhfHarness = ({
  onSubmit,
}: {
  onSubmit: (values: RhfHarnessValues) => void;
}): ReactElement => {
  const { register, handleSubmit } = useForm<RhfHarnessValues>({
    defaultValues: { dueDate: "" },
  });
  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      <DateField label="返却予定日" {...register("dueDate")} />
      <button type="submit">送信</button>
    </form>
  );
};

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

  it("type=text の input としてレンダリングされ、placeholder と inputMode が設定される", () => {
    render(<DateField label="次回期限" />);

    const input = screen.getByLabelText("次回期限");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("placeholder", "YYYY-MM-DD");
    expect(input).toHaveAttribute("inputMode", "numeric");
  });

  it("type を上書きしようとしても text のまま固定される", () => {
    render(<DateField label="次回期限" type="date" />);

    const input = screen.getByLabelText("次回期限");
    expect(input).toHaveAttribute("type", "text");
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

  it("カレンダーボタンをクリックするとダイアログが開閉し、aria-expanded が切り替わる", async () => {
    const user = userEvent.setup();
    render(<DateField label="次回期限" />);

    const toggleButton = screen.getByRole("button", { name: "カレンダーを開く" });
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");

    await user.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "カレンダー" })).toBeInTheDocument();

    await user.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog", { name: "カレンダー" })).not.toBeInTheDocument();
  });

  it("日付セルをクリックすると input に YYYY-MM-DD で反映され、閉じてボタンへフォーカスが戻る", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<() => void>();
    render(<DateField label="次回期限" defaultValue="2026-07-03" onChange={handleChange} />);

    const toggleButton = screen.getByRole("button", { name: "カレンダーを開く" });
    await user.click(toggleButton);
    await user.click(screen.getByRole("button", { name: "2026年7月10日" }));

    expect(screen.getByLabelText("次回期限")).toHaveValue("2026-07-10");
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "カレンダー" })).not.toBeInTheDocument();
    expect(toggleButton).toHaveFocus();
  });

  it("「今日」ボタンをクリックすると今日の日付を選択して閉じる", async () => {
    const user = userEvent.setup();
    render(<DateField label="次回期限" defaultValue="" />);

    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }));
    await user.click(screen.getByRole("button", { name: "今日" }));

    expect(screen.getByLabelText("次回期限")).toHaveValue("2026-07-15");
    expect(screen.queryByRole("dialog", { name: "カレンダー" })).not.toBeInTheDocument();
  });

  it("次の月/前の月ボタンで表示月が変わる", async () => {
    const user = userEvent.setup();
    render(<DateField label="次回期限" defaultValue="2026-07-03" />);
    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }));

    expect(screen.getByText("2026年7月")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次の月" }));
    expect(screen.getByText("2026年8月")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "前の月" }));
    await user.click(screen.getByRole("button", { name: "前の月" }));
    expect(screen.getByText("2026年6月")).toBeInTheDocument();
  });

  it("グリッド上で Escape を押すと閉じてカレンダーボタンへフォーカスが戻る", async () => {
    const user = userEvent.setup();
    render(<DateField label="次回期限" defaultValue="2026-07-03" />);
    const toggleButton = screen.getByRole("button", { name: "カレンダーを開く" });
    await user.click(toggleButton);

    expect(screen.getByRole("grid")).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "カレンダー" })).not.toBeInTheDocument();
    expect(toggleButton).toHaveFocus();
  });

  it("外側をクリックするとカレンダーが閉じる", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <DateField label="次回期限" defaultValue="2026-07-03" />
        <button type="button">外側</button>
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }));
    expect(screen.getByRole("dialog", { name: "カレンダー" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "外側" }));
    expect(screen.queryByRole("dialog", { name: "カレンダー" })).not.toBeInTheDocument();
  });

  it("react-hook-form の register と組み合わせてカレンダーから選択した日付が送信値に反映される", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn<() => void>();
    render(<RhfHarness onSubmit={handleSubmit} />);

    await user.click(screen.getByRole("button", { name: "カレンダーを開く" }));
    await user.click(screen.getByRole("button", { name: "2026年7月20日" }));
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: "2026-07-20" }),
      expect.anything(),
    );
  });
});
