import { describe, expect, it } from "vitest";

// なぜ: vitest.setup.ts のdialog polyfillが正しく効いているかを最小限に確認するスモークテスト
// （このテストが落ちる場合、setupFilesの読み込み自体が壊れている可能性が高い）。
describe("vitest.setup.ts", () => {
  it("dialogのshowModal/closeがpolyfillされている", () => {
    const dialog = document.createElement("dialog");
    document.body.append(dialog);

    expect(typeof dialog.showModal).toBe("function");
    expect(typeof dialog.close).toBe("function");

    dialog.showModal();
    expect(dialog.hasAttribute("open")).toBe(true);

    dialog.close();
    expect(dialog.hasAttribute("open")).toBe(false);
  });
});
