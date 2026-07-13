import { Manual } from "@/features/manual";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* jsdom は Highlight API 未実装のため、CSS Custom Highlight API 相当の最小スタブを用意する。
   CSS グローバル自体は jsdom に存在するが highlights プロパティは無いため直接代入で仕込む。 */
class HighlightStub {
  public ranges: unknown[];
  public constructor(...ranges: unknown[]) {
    this.ranges = ranges;
  }
}

const setUpHighlightApiStub = (): void => {
  vi.stubGlobal("Highlight", HighlightStub);
  (CSS as unknown as Record<string, unknown>).highlights = new Map();
};

const tearDownHighlightApiStub = (): void => {
  vi.unstubAllGlobals();
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- テスト用スタブの後始末のため
  delete (CSS as unknown as Record<string, unknown>).highlights;
};

/** 「n / m 件」表示から m(総件数)を取り出す。0件は「一致なし」表示のため呼び出し側で除外する */
const readMatchCount = (): { current: number; total: number } => {
  const text = screen.getByText(/\d+ \/ \d+ 件/u).textContent ?? "";
  const matched = /(?<current>\d+) \/ (?<total>\d+) 件/u.exec(text);
  return {
    current: Number(matched?.groups?.["current"]),
    total: Number(matched?.groups?.["total"]),
  };
};

const searchInput = (): HTMLElement => screen.getByLabelText("マニュアル内検索");
const nextButton = (): HTMLElement => screen.getByRole("button", { name: "次の一致へ" });
const previousButton = (): HTMLElement => screen.getByRole("button", { name: "前の一致へ" });

describe("ManualSearchBar", () => {
  beforeEach(() => {
    setupStoreIsolation();
    Element.prototype.scrollIntoView = vi.fn();
    setUpHighlightApiStub();
  });

  afterEach(() => {
    tearDownHighlightApiStub();
  });

  it("検索フィールド(aria-label「マニュアル内検索」)が表示される", () => {
    renderWithStore(<Manual />);

    expect(searchInput()).toBeInTheDocument();
  });

  it("一致する語を入力すると「1 / n 件」形式で件数が表示され、scrollIntoView が呼ばれる", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    renderWithStore(<Manual />);
    fireEvent.change(searchInput(), { target: { value: "点検" } });

    const { current, total } = readMatchCount();
    expect(current).toBe(1);
    expect(total).toBeGreaterThan(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("Enter で次の一致へ進み、最後の一致で Enter すると1件目に戻る(wrap)", () => {
    renderWithStore(<Manual />);
    fireEvent.change(searchInput(), { target: { value: "点検" } });

    const { total } = readMatchCount();

    fireEvent.keyDown(searchInput(), { key: "Enter" });
    expect(readMatchCount()).toEqual({ current: 2, total });

    // 3件目以降、最後の一致まで進める
    for (let step = 3; step <= total; step += 1) {
      fireEvent.keyDown(searchInput(), { key: "Enter" });
    }
    expect(readMatchCount()).toEqual({ current: total, total });

    // 最後の一致から Enter すると先頭(1件目)に戻る
    fireEvent.keyDown(searchInput(), { key: "Enter" });
    expect(readMatchCount()).toEqual({ current: 1, total });
  });

  it("Shift+Enter で前へ戻る(1件目から wrap して最後の一致へ)", () => {
    renderWithStore(<Manual />);
    fireEvent.change(searchInput(), { target: { value: "点検" } });

    const { total } = readMatchCount();

    fireEvent.keyDown(searchInput(), { key: "Enter", shiftKey: true });
    expect(readMatchCount()).toEqual({ current: total, total });
  });

  it("一致しない語では「一致なし」表示になり、「次へ」「前へ」ボタンが disabled になる", () => {
    renderWithStore(<Manual />);
    fireEvent.change(searchInput(), { target: { value: "zzzz" } });

    expect(screen.getByText("一致なし")).toBeInTheDocument();
    expect(nextButton()).toBeDisabled();
    expect(previousButton()).toBeDisabled();
  });

  it("Escape で入力が空になり件数表示が消える", () => {
    renderWithStore(<Manual />);
    fireEvent.change(searchInput(), { target: { value: "点検" } });
    expect(readMatchCount().total).toBeGreaterThan(0);

    fireEvent.keyDown(searchInput(), { key: "Escape" });

    expect(searchInput()).toHaveValue("");
    expect(screen.queryByText(/\d+ \/ \d+ 件/u)).not.toBeInTheDocument();
    expect(screen.queryByText("一致なし")).not.toBeInTheDocument();
  });

  it("スタブした CSS.highlights に manual-search-match が登録される", () => {
    renderWithStore(<Manual />);
    fireEvent.change(searchInput(), { target: { value: "点検" } });

    const { highlights } = CSS as unknown as { highlights: Map<string, unknown> };
    expect(highlights.has("manual-search-match")).toBe(true);
  });

  it("Highlight API 非対応環境でもクラッシュせず、入力と Enter で scrollIntoView が呼ばれる(段階的機能低下)", () => {
    tearDownHighlightApiStub();

    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    renderWithStore(<Manual />);

    expect(() => {
      fireEvent.change(searchInput(), { target: { value: "点検" } });
      fireEvent.keyDown(searchInput(), { key: "Enter" });
    }).not.toThrow();

    expect(scrollIntoView).toHaveBeenCalled();
  });
});
