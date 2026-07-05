import { Modal } from "@/components/ui/Modal";
import { fireEvent, render, screen } from "@testing-library/react";
// なぜ: vitest.setup.ts（tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の
// 型解決にjest-domのmatcher拡張が伝播しないため、テストファイル側でも明示的にimportする
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";

describe("Modal", () => {
  it("open=trueでタイトル・本文が表示され、open=falseではdialogのopen属性が外れる", () => {
    const { container, rerender } = render(
      <Modal open title="点検項目の編集" onClose={vi.fn<() => void>()}>
        <p>本文</p>
      </Modal>,
    );

    expect(screen.getByText("点検項目の編集")).toBeInTheDocument();
    expect(screen.getByText("本文")).toBeInTheDocument();
    expect(container.querySelector("dialog")).toHaveAttribute("open");

    rerender(
      <Modal open={false} title="点検項目の編集" onClose={vi.fn<() => void>()}>
        <p>本文</p>
      </Modal>,
    );

    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("isDirty未指定（既定false）で×ボタンを押すとonCloseが呼ばれる", () => {
    const onClose = vi.fn<() => void>();
    render(
      <Modal open title="点検項目の編集" onClose={onClose}>
        <p>本文</p>
      </Modal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("isDirty=falseでcancelイベント（Esc相当）が起きるとonCloseが呼ばれる", () => {
    const onClose = vi.fn<() => void>();
    const { container } = render(
      <Modal open title="点検項目の編集" onClose={onClose} isDirty={false}>
        <p>本文</p>
      </Modal>,
    );
    const dialogElement = container.querySelector("dialog");
    if (!dialogElement) throw new Error("dialog要素が見つかりません");

    fireEvent(dialogElement, new Event("cancel", { cancelable: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("isDirty=trueで×ボタンを押すとonCloseは呼ばれず破棄確認が表示され、「破棄」でonCloseが呼ばれる", () => {
    const onClose = vi.fn<() => void>();
    render(
      <Modal open title="点検項目の編集" onClose={onClose} isDirty>
        <p>本文</p>
      </Modal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("編集内容を破棄しますか?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "破棄" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("破棄確認表示中に「キャンセル」を押すとonCloseは呼ばれず編集を継続できる", () => {
    const onClose = vi.fn<() => void>();
    render(
      <Modal open title="点検項目の編集" onClose={onClose} isDirty>
        <p>本文</p>
      </Modal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText("編集内容を破棄しますか?")).not.toBeInTheDocument();
    expect(screen.getByText("本文")).toBeInTheDocument();
  });

  it("オーバーレイクリック（isDirty=false）でonCloseが呼ばれる", () => {
    const onClose = vi.fn<() => void>();
    const { container } = render(
      <Modal open title="点検項目の編集" onClose={onClose} isDirty={false}>
        <p>本文</p>
      </Modal>,
    );
    const dialogElement = container.querySelector("dialog");
    if (!dialogElement) throw new Error("dialog要素が見つかりません");

    fireEvent.click(dialogElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
