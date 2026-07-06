import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { fireEvent, render, screen } from "@testing-library/react";
// なぜ: vitest.setup.ts（tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の
// 型解決にjest-domのmatcher拡張が伝播しないため、テストファイル側でも明示的にimportする。
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";

describe("ConfirmModal", () => {
  it("open=trueで表示され、open=falseではdialogのopen属性が外れる", () => {
    const { container, rerender } = render(
      <ConfirmModal
        open
        title="削除の確認"
        message="この機器を削除しますか?"
        confirmLabel="削除"
        onConfirm={vi.fn<() => void>()}
        onCancel={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText("削除の確認")).toBeInTheDocument();
    expect(container.querySelector("dialog")).toHaveAttribute("open");

    rerender(
      <ConfirmModal
        open={false}
        title="削除の確認"
        message="この機器を削除しますか?"
        confirmLabel="削除"
        onConfirm={vi.fn<() => void>()}
        onCancel={vi.fn<() => void>()}
      />,
    );

    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("開いた直後にキャンセルボタンへフォーカスが当たる", () => {
    render(
      <ConfirmModal
        open
        title="削除の確認"
        message="この機器を削除しますか?"
        confirmLabel="削除"
        onConfirm={vi.fn<() => void>()}
        onCancel={vi.fn<() => void>()}
      />,
    );

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "キャンセル" }));
  });

  it("実行ボタンクリックでonConfirmが呼ばれる", () => {
    const onConfirm = vi.fn<() => void>();
    render(
      <ConfirmModal
        open
        title="削除の確認"
        message="この機器を削除しますか?"
        confirmLabel="削除"
        onConfirm={onConfirm}
        onCancel={vi.fn<() => void>()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("キャンセルボタンクリックでonCancelが呼ばれる", () => {
    const onCancel = vi.fn<() => void>();
    render(
      <ConfirmModal
        open
        title="削除の確認"
        message="この機器を削除しますか?"
        confirmLabel="削除"
        onConfirm={vi.fn<() => void>()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("cancelイベント（Esc相当）が起きるとonCancelが呼ばれる", () => {
    const onCancel = vi.fn<() => void>();
    const { container } = render(
      <ConfirmModal
        open
        title="削除の確認"
        message="この機器を削除しますか?"
        confirmLabel="削除"
        onConfirm={vi.fn<() => void>()}
        onCancel={onCancel}
      />,
    );
    const dialogElement = container.querySelector("dialog");
    if (!dialogElement) throw new Error("dialog要素が見つかりません");

    fireEvent(dialogElement, new Event("cancel", { cancelable: true }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("オーバーレイクリックでonCancelが呼ばれる", () => {
    const onCancel = vi.fn<() => void>();
    const { container } = render(
      <ConfirmModal
        open
        title="削除の確認"
        message="この機器を削除しますか?"
        confirmLabel="削除"
        onConfirm={vi.fn<() => void>()}
        onCancel={onCancel}
      />,
    );
    const dialogElement = container.querySelector("dialog");
    if (!dialogElement) throw new Error("dialog要素が見つかりません");

    fireEvent.click(dialogElement);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("実行ボタンにbg-dangerクラスが付与される", () => {
    render(
      <ConfirmModal
        open
        title="削除の確認"
        message="この機器を削除しますか?"
        confirmLabel="削除"
        onConfirm={vi.fn<() => void>()}
        onCancel={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByRole("button", { name: "削除" })).toHaveClass("bg-danger");
  });
});
