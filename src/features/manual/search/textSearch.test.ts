import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { collectMatchRanges, findMatchOffsets, normalizeForSearch } from "./textSearch";

describe("normalizeForSearch", () => {
  it("カタカナをひらがなに変換する", () => {
    expect(normalizeForSearch("テンケン")).toBe("てんけん");
  });

  it("全角英数記号を半角に変換する", () => {
    expect(normalizeForSearch("ＡＢＣ１２３")).toBe("abc123");
  });

  it("半角化した英大文字を小文字に変換する", () => {
    expect(normalizeForSearch("ABC")).toBe("abc");
  });

  it("変換対象外の文字(漢字・ひらがな・半角記号等)はそのまま残る", () => {
    expect(normalizeForSearch("点検校正 abc")).toBe("点検校正 abc");
  });

  it("任意の文字列に対して正規化前後で長さが変わらない(property)", () => {
    fc.assert(
      fc.property(fc.string({ unit: "binary" }), (text) => {
        expect(normalizeForSearch(text).length).toBe(text.length);
      }),
    );
  });
});

describe("findMatchOffsets", () => {
  it("複数の一致位置を返す", () => {
    expect(findMatchOffsets("点検、点検、点検", "点検")).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 5 },
      { start: 6, end: 8 },
    ]);
  });

  it("重なる候補は非重複で返す(例: 'aaa' から 'aa' は1件)", () => {
    expect(findMatchOffsets("aaa", "aa")).toEqual([{ start: 0, end: 2 }]);
  });

  it("空クエリでは空配列を返す", () => {
    expect(findMatchOffsets("点検校正", "")).toEqual([]);
  });

  it("空白のみのクエリでは空配列を返す", () => {
    expect(findMatchOffsets("点検校正", "   ")).toEqual([]);
  });

  it("カタカナのクエリでひらがなの本文に一致する", () => {
    expect(findMatchOffsets("てんけん", "テンケン")).toEqual([{ start: 0, end: 4 }]);
  });

  it("全角英字のクエリで半角の本文に一致する", () => {
    expect(findMatchOffsets("abc123", "ＡＢＣ")).toEqual([{ start: 0, end: 3 }]);
  });
});

describe("collectMatchRanges", () => {
  it("複数のテキストノードから正しい Range(startContainer/startOffset/endOffset)を取得できる", () => {
    const container = document.createElement("div");
    container.innerHTML =
      '<p>点検校正の期限を管理します。</p><p>詳しくは<a href="#">点検校正</a>のマニュアルを参照してください。</p>';

    const ranges = collectMatchRanges(container, "点検校正");

    expect(ranges).toHaveLength(2);

    const [firstRange, secondRange] = ranges;
    expect(firstRange?.startContainer.textContent).toBe("点検校正の期限を管理します。");
    expect(firstRange?.startOffset).toBe(0);
    expect(firstRange?.endOffset).toBe(4);

    // 2つ目の一致は <a> タグの中のテキストノード全体("点検校正")
    expect(secondRange?.startContainer.textContent).toBe("点検校正");
    expect(secondRange?.startOffset).toBe(0);
    expect(secondRange?.endOffset).toBe(4);
  });

  it("要素境界をまたぐ語は一致しない(D-072の割り切り)", () => {
    const container = document.createElement("div");
    // "点検" が <a> タグで "点" と "検" に分断されているため一致しない
    container.innerHTML = '<p>点<a href="#">検</a>校正</p>';

    expect(collectMatchRanges(container, "点検")).toEqual([]);
  });
});
