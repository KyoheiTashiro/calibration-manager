import { Select } from "@/components/ui/Select";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する。
import "@testing-library/jest-dom/vitest";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

const OPTIONS = [
  { value: "vendorA", label: "取引先A" },
  { value: "vendorB", label: "取引先B" },
  { value: "vendorC", label: "取引先C" },
];

// なぜ: onChange 必須 prop を満たすだけで呼び出しを assert しないテスト用の共有ダミー
// (Select.stories.tsx の noop と同じ対処)。呼び出しを検証するテストは個別に vi.fn() を使う。
const noop = (): void => {
  // no-op
};

describe("Select", () => {
  // なぜ describe を分割するか: oxlint max-statements(20) 対策。テストケース網羅により
  // 単一 describe 直下の it 数が上限を超えるため、観点ごとに分割する。
  describe("表示(ラベル・エラー・値・disabled)", () => {
    it("label が表示され、getByLabelText / getByRole の両方で取得できる", () => {
      render(<Select label="取引先" options={OPTIONS} value="" onChange={noop} />);

      expect(screen.getByText("取引先")).toBeInTheDocument();
      expect(screen.getByLabelText("取引先")).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: "取引先" })).toBeInTheDocument();
    });

    it("required 時に赤アスタリスクが表示される", () => {
      render(<Select label="取引先" options={OPTIONS} value="" onChange={noop} required />);

      expect(screen.getByText("*")).toHaveClass("text-red-600");
    });

    it("required を指定しない場合はアスタリスクが表示されない", () => {
      render(<Select label="取引先" options={OPTIONS} value="" onChange={noop} />);

      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("error 指定時にエラーメッセージが表示され aria-describedby で紐付く", () => {
      render(
        <Select label="取引先" options={OPTIONS} value="" onChange={noop} error="必須項目です" />,
      );

      const trigger = screen.getByRole("combobox", { name: "取引先" });
      const errorMessage = screen.getByText("必須項目です");
      expect(errorMessage).toHaveClass("text-xs", "text-red-600");
      expect(trigger).toHaveAttribute("aria-describedby", errorMessage.id);
      expect(trigger).toHaveAttribute("aria-invalid", "true");
    });

    it("error 未指定時は aria-describedby / aria-invalid が付かない", () => {
      render(<Select label="取引先" options={OPTIONS} value="" onChange={noop} />);

      const trigger = screen.getByRole("combobox", { name: "取引先" });
      expect(trigger).not.toHaveAttribute("aria-describedby");
      expect(trigger).not.toHaveAttribute("aria-invalid");
    });

    it("error 指定時に border-red-500 クラスが付く", () => {
      render(
        <Select label="取引先" options={OPTIONS} value="" onChange={noop} error="必須項目です" />,
      );

      const trigger = screen.getByRole("combobox", { name: "取引先" });
      expect(trigger.className).toContain("border-red-500");
    });

    it("value に対応する option のラベルがトリガーに表示される", () => {
      render(<Select label="取引先" options={OPTIONS} value="vendorB" onChange={noop} />);

      expect(screen.getByRole("combobox", { name: "取引先" })).toHaveTextContent("取引先B");
    });

    it("placeholder 指定時、未選択なら placeholder がトリガーに表示される", () => {
      render(
        <Select
          label="取引先"
          options={OPTIONS}
          value=""
          onChange={noop}
          placeholder="選択してください"
        />,
      );

      expect(screen.getByRole("combobox", { name: "取引先" })).toHaveTextContent(
        "選択してください",
      );
    });

    it("placeholder 未指定かつ未選択ならトリガーは空表示", () => {
      render(<Select label="取引先" options={OPTIONS} value="" onChange={noop} />);

      expect(screen.getByRole("combobox", { name: "取引先" })).toHaveTextContent("");
    });

    it("labelHidden 指定時、label は sr-only になり getByRole は引き続き機能する", () => {
      render(<Select label="取引先" labelHidden options={OPTIONS} value="" onChange={noop} />);

      expect(screen.getByText("取引先")).toHaveClass("sr-only");
      expect(screen.getByRole("combobox", { name: "取引先" })).toBeInTheDocument();
    });

    it("disabled 時はトリガーが disabled になり開かない", async () => {
      const user = userEvent.setup();
      render(<Select label="取引先" options={OPTIONS} value="" onChange={noop} disabled />);

      const trigger = screen.getByRole("combobox", { name: "取引先" });
      expect(trigger).toBeDisabled();

      await user.click(trigger);

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("マウス操作(開閉・選択)", () => {
    it("クリックで開閉し、option クリックで選択されて onChange が呼ばれ閉じる", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn<(value: string) => void>();
      render(<Select label="取引先" options={OPTIONS} value="" onChange={handleChange} />);

      const trigger = screen.getByRole("combobox", { name: "取引先" });
      await user.click(trigger);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      await user.click(screen.getByRole("option", { name: "取引先B" }));

      expect(handleChange).toHaveBeenCalledExactlyOnceWith("vendorB");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it("選択中の option は aria-selected と font-medium text-primary、CheckIcon を持つ", async () => {
      const user = userEvent.setup();
      render(<Select label="取引先" options={OPTIONS} value="vendorB" onChange={noop} />);

      await user.click(screen.getByRole("combobox", { name: "取引先" }));

      const selectedOption = screen.getByRole("option", { name: "取引先B" });
      expect(selectedOption).toHaveAttribute("aria-selected", "true");
      expect(selectedOption.className).toContain("font-medium");
      expect(selectedOption.className).toContain("text-primary");
      expect(selectedOption.querySelector("svg")).toBeInTheDocument();

      const otherOption = screen.getByRole("option", { name: "取引先A" });
      expect(otherOption).toHaveAttribute("aria-selected", "false");
    });

    it("placeholder 指定時、先頭 option として選択で解除できる", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn<(value: string) => void>();
      render(
        <Select
          label="取引先"
          options={OPTIONS}
          value="vendorA"
          onChange={handleChange}
          placeholder="選択してください"
        />,
      );

      await user.click(screen.getByRole("combobox", { name: "取引先" }));
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveTextContent("選択してください");

      await user.click(options[0]);

      expect(handleChange).toHaveBeenCalledExactlyOnceWith("");
    });

    it("外側クリックで閉じる", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Select label="取引先" options={OPTIONS} value="" onChange={noop} />
          <button type="button">外側</button>
        </div>,
      );

      await user.click(screen.getByRole("combobox", { name: "取引先" }));
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "外側" }));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("閉じたとき(選択・Escape・外クリック)に onBlur が呼ばれる", async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn<() => void>();

      render(
        <div>
          <Select label="取引先" options={OPTIONS} value="" onChange={noop} onBlur={handleBlur} />
          <button type="button">外側</button>
        </div>,
      );
      const trigger = screen.getByRole("combobox", { name: "取引先" });

      await user.click(trigger);
      await user.click(screen.getByRole("option", { name: "取引先A" }));
      expect(handleBlur).toHaveBeenCalledTimes(1);

      trigger.focus();
      await user.keyboard("{Enter}");
      await user.keyboard("{Escape}");
      expect(handleBlur).toHaveBeenCalledTimes(2);

      await user.click(trigger);
      await user.click(screen.getByRole("button", { name: "外側" }));
      expect(handleBlur).toHaveBeenCalledTimes(3);
    });
  });

  describe("キーボード操作", () => {
    it("トリガーで Enter キーを押すと開き、選択中 option にフォーカスが当たる", async () => {
      const user = userEvent.setup();
      render(<Select label="取引先" options={OPTIONS} value="vendorB" onChange={noop} />);

      const trigger = screen.getByRole("combobox", { name: "取引先" });
      trigger.focus();
      await user.keyboard("{Enter}");

      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "取引先B" }).id,
      );
    });

    it("ArrowDown/ArrowUp でフォーカス移動し、Enter で選択して閉じフォーカスが戻る", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn<(value: string) => void>();
      render(<Select label="取引先" options={OPTIONS} value="vendorA" onChange={handleChange} />);

      const trigger = screen.getByRole("combobox", { name: "取引先" });
      trigger.focus();
      // ArrowDown で開く → 選択中(vendorA/index0)にフォーカス
      await user.keyboard("{ArrowDown}");
      const listbox = screen.getByRole("listbox");

      // index0 → index1(vendorB) → index2(vendorC)
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");
      expect(listbox).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "取引先C" }).id,
      );

      // index2 → index1(vendorB)
      await user.keyboard("{ArrowUp}");
      expect(listbox).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "取引先B" }).id,
      );

      await user.keyboard("{Enter}");
      expect(handleChange).toHaveBeenCalledExactlyOnceWith("vendorB");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it("Home/End で先頭/末尾の option にフォーカスが移動する", async () => {
      const user = userEvent.setup();
      render(<Select label="取引先" options={OPTIONS} value="vendorB" onChange={noop} />);

      const trigger = screen.getByRole("combobox", { name: "取引先" });
      trigger.focus();
      await user.keyboard("{Enter}");
      const listbox = screen.getByRole("listbox");

      await user.keyboard("{End}");
      expect(listbox).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "取引先C" }).id,
      );

      await user.keyboard("{Home}");
      expect(listbox).toHaveAttribute(
        "aria-activedescendant",
        screen.getByRole("option", { name: "取引先A" }).id,
      );
    });

    it("Escape で閉じてトリガーにフォーカスが戻る", async () => {
      const user = userEvent.setup();
      render(<Select label="取引先" options={OPTIONS} value="" onChange={noop} />);

      const trigger = screen.getByRole("combobox", { name: "取引先" });
      trigger.focus();
      await user.keyboard("{Enter}");
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  describe("ref/name", () => {
    it("ref に trigger button が渡る(RHF field.ref 互換)", () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Select label="取引先" options={OPTIONS} value="" onChange={noop} ref={ref} />);

      expect(ref.current).toBe(screen.getByRole("combobox", { name: "取引先" }));
    });

    it("name がトリガーの name 属性へ渡る", () => {
      render(<Select label="取引先" options={OPTIONS} value="" onChange={noop} name="vendorId" />);

      expect(screen.getByRole("combobox", { name: "取引先" })).toHaveAttribute("name", "vendorId");
    });
  });
});
