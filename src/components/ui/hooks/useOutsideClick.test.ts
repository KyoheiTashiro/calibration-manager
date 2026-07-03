import { useOutsideClick } from "@/components/ui/hooks/useOutsideClick";
import { renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { describe, expect, it, vi } from "vitest";

// なぜ describe の外に置くか: unicorn/consistent-function-scoping が、外側スコープの変数を
// 参照しない関数をネストしないよう要求するため（このヘルパーは引数・親スコープ変数に依存しない）。
const setupDom = (): { insideElement: HTMLElement; outsideElement: HTMLElement } => {
  const insideElement = document.createElement("div");
  const outsideElement = document.createElement("div");
  document.body.append(insideElement, outsideElement);

  return { insideElement, outsideElement };
};

describe("useOutsideClick", () => {
  it("対象要素の内側クリックではコールバックが呼ばれない", () => {
    const { insideElement, outsideElement } = setupDom();
    const onOutsideClick = vi.fn();
    const ref: RefObject<HTMLElement | null> = { current: insideElement };

    renderHook(() => useOutsideClick(ref, onOutsideClick));
    insideElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(onOutsideClick).not.toHaveBeenCalled();

    insideElement.remove();
    outsideElement.remove();
  });

  it("対象要素の外側クリックでコールバックが呼ばれる", () => {
    const { insideElement, outsideElement } = setupDom();
    const onOutsideClick = vi.fn();
    const ref: RefObject<HTMLElement | null> = { current: insideElement };

    renderHook(() => useOutsideClick(ref, onOutsideClick));
    outsideElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(onOutsideClick).toHaveBeenCalledTimes(1);

    insideElement.remove();
    outsideElement.remove();
  });

  it("アンマウント後は外側クリックしてもコールバックが呼ばれない", () => {
    const { insideElement, outsideElement } = setupDom();
    const onOutsideClick = vi.fn();
    const ref: RefObject<HTMLElement | null> = { current: insideElement };

    const { unmount } = renderHook(() => useOutsideClick(ref, onOutsideClick));
    unmount();
    outsideElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(onOutsideClick).not.toHaveBeenCalled();

    insideElement.remove();
    outsideElement.remove();
  });
});
