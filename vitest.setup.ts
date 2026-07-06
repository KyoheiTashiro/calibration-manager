import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

// アロー関数では `this: HTMLDialogElement` の型付けができないため通常の関数式にする。
const polyfillShowModal = function polyfillShowModal(this: HTMLDialogElement): void {
  this.setAttribute("open", "");
};

const polyfillClose = function polyfillClose(this: HTMLDialogElement): void {
  this.removeAttribute("open");
};

// jsdomは `<dialog>` のモーダルAPI（showModal/close）未実装のため、open属性の付け外しで代替する。
// 既存実装チェックは、将来jsdomが対応した際に上書きして挙動差異を隠さないため。
if (typeof HTMLDialogElement.prototype.showModal !== "function") {
  HTMLDialogElement.prototype.showModal = polyfillShowModal;
}

if (typeof HTMLDialogElement.prototype.close !== "function") {
  HTMLDialogElement.prototype.close = polyfillClose;
}
