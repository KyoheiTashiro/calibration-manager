import { useDialog } from "@/components/ui/hooks/useDialog";
import { render } from "@testing-library/react";
// なぜ: vitest.setup.ts（tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の
// 型解決にjest-domのmatcher拡張が伝播しないため、テストファイル側でも明示的にimportする
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

type TestDialogProps = { open: boolean };

const TestDialog = ({ open }: TestDialogProps): ReactElement => {
  const dialogRef = useDialog(open);
  return <dialog ref={dialogRef}>ダイアログ本文</dialog>;
};

describe("useDialog", () => {
  it("open=trueでshowModalが呼ばれdialogにopen属性が付く", () => {
    const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const { container } = render(<TestDialog open />);

    const dialogElement = container.querySelector("dialog");

    expect(dialogElement).toHaveAttribute("open");
    expect(showModalSpy).toHaveBeenCalledTimes(1);

    showModalSpy.mockRestore();
  });

  it("open=falseではshowModalが呼ばれずopen属性も付かない", () => {
    const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const { container } = render(<TestDialog open={false} />);

    const dialogElement = container.querySelector("dialog");

    expect(dialogElement).not.toHaveAttribute("open");
    expect(showModalSpy).not.toHaveBeenCalled();

    showModalSpy.mockRestore();
  });

  it("open=trueからfalseへrerenderするとcloseが呼ばれopen属性が外れる", () => {
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
    const { container, rerender } = render(<TestDialog open />);

    rerender(<TestDialog open={false} />);
    const dialogElement = container.querySelector("dialog");

    expect(dialogElement).not.toHaveAttribute("open");
    expect(closeSpy).toHaveBeenCalledTimes(1);

    closeSpy.mockRestore();
  });

  it("既に開いている状態でopen=trueのままrerenderしてもshowModalは再度呼ばれない", () => {
    const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const { rerender } = render(<TestDialog open />);

    rerender(<TestDialog open />);

    expect(showModalSpy).toHaveBeenCalledTimes(1);

    showModalSpy.mockRestore();
  });

  it("開いた状態でアンマウントするとcloseが呼ばれる", () => {
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
    const { unmount } = render(<TestDialog open />);

    unmount();

    expect(closeSpy).toHaveBeenCalledTimes(1);

    closeSpy.mockRestore();
  });

  it("閉じた状態でアンマウントしてもcloseは呼ばれない", () => {
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
    const { unmount } = render(<TestDialog open={false} />);

    unmount();

    expect(closeSpy).not.toHaveBeenCalled();

    closeSpy.mockRestore();
  });
});
