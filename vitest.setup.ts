import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
// なぜ: toBeInTheDocument 等のDOM向けmatcherをvitestの`expect`に拡張するため
// （docs/testing.md「setup（vitest.setup.ts）」）。
import "@testing-library/jest-dom/vitest";

// なぜ: テスト間でDOMが汚染されると後続テストが予期せぬ要素を拾ってしまうため、
// 各テスト終了後に必ずレンダー結果をアンマウントする（docs/testing.md）。
afterEach(() => {
  cleanup();
});

// なぜトップレベルの関数式にするか: `unicorn/consistent-function-scoping` により
// 外側スコープの変数を参照しない関数はネスト定義を避ける方針、かつ `eslint/func-style` により
// 関数式を使う方針のため。アロー関数では `this` 引数の型付けができない
// （呼び出し元の `HTMLDialogElement` を `this` として受け取る必要がある）ため通常の関数式にする。
const polyfillShowModal = function polyfillShowModal(this: HTMLDialogElement): void {
  this.setAttribute("open", "");
};

const polyfillClose = function polyfillClose(this: HTMLDialogElement): void {
  this.removeAttribute("open");
};

// なぜ: jsdomは `<dialog>` 要素のモーダルAPI（showModal/close）を実装していないため、
// Modal/ConfirmModal等のコンポーネントテストが `not implemented` エラーで落ちてしまう。
// 実際のモーダル表示ロジック（open属性の付け外し）を素朴に再現するpolyfillを当てる
// （docs/testing.md「setup（vitest.setup.ts）」）。
// なぜ既存実装チェックを入れるか: 将来jsdomが対応した場合に本polyfillで上書きしてしまい、
// 挙動差異に気づけなくなることを避けるため。
if (typeof HTMLDialogElement.prototype.showModal !== "function") {
  HTMLDialogElement.prototype.showModal = polyfillShowModal;
}

if (typeof HTMLDialogElement.prototype.close !== "function") {
  HTMLDialogElement.prototype.close = polyfillClose;
}
