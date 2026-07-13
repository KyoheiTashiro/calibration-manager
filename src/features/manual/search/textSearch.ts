/* マニュアル内検索(D-072)の純関数群。DOM Range 生成の都合上、正規化・一致検索とも
   「元テキストと文字インデックスが1対1で対応する」ことを前提にしている。 */

/* 全角英数記号(U+FF01〜U+FF5E)を半角へ変換する。コードポイントを 65_248(0xFEE0) 引くだけで
   対応する半角文字になる範囲のため、置換のみで1文字→1文字の変換が保証できる。
   フォーマッタが16進数リテラルを小文字化し unicorn/number-literal-case(大文字化必須)と
   衝突するため、ここでは10進数リテラルを使う。 */
const toHalfWidthAlphanumeric = (text: string): string =>
  text.replaceAll(/[！-～]/gu, (character) =>
    String.fromCodePoint((character.codePointAt(0) ?? 0) - 65_248),
  );

/** 半角化後の英大文字(A-Z)を小文字へ変換する */
const toLowerCaseAscii = (text: string): string =>
  text.replaceAll(/[A-Z]/gu, (character) => character.toLowerCase());

/* カタカナ(U+30A1〜U+30F6)をひらがなへ変換する。コードポイントを 0x60 引くだけで
   対応するひらがな文字になる範囲のため、置換のみで1文字→1文字の変換が保証できる。 */
const toHiragana = (text: string): string =>
  text.replaceAll(/[ァ-ヶ]/gu, (character) =>
    String.fromCodePoint((character.codePointAt(0) ?? 0) - 0x60),
  );

/**
 * 検索用にテキストを正規化する。
 *
 * なぜ長さ保存(1文字→1文字)変換のみに限定するか: Range 生成時に元テキストの
 * 文字インデックスをそのまま使うため(collectMatchRanges 参照)。正規化前後で
 * 文字数・各文字の位置が変わると、正規化後の一致位置を元テキストの Range に
 * そのまま適用できなくなる。
 */
export const normalizeForSearch = (text: string): string =>
  toHiragana(toLowerCaseAscii(toHalfWidthAlphanumeric(text)));

export type MatchOffset = { start: number; end: number };

/**
 * text 内から query に一致する箇所を(正規化した上で)重複なく探す。
 * 次の検索開始位置を `start + query.length` にすることで、例えば text="aaa",
 * query="aa" のとき一致が重ならないようにする(1件のみ: [0, 2))。
 *
 * normalizeForSearch は長さ保存変換のため、正規化後の位置は元テキストの
 * 文字インデックスとそのまま一致する。
 */
export const findMatchOffsets = (text: string, query: string): MatchOffset[] => {
  const normalizedQuery = normalizeForSearch(query);
  if (normalizedQuery.trim() === "") {
    return [];
  }

  const normalizedText = normalizeForSearch(text);
  const offsets: MatchOffset[] = [];
  let searchStart = 0;

  for (;;) {
    const foundIndex = normalizedText.indexOf(normalizedQuery, searchStart);
    if (foundIndex === -1) {
      break;
    }
    const end = foundIndex + normalizedQuery.length;
    offsets.push({ start: foundIndex, end });
    searchStart = end;
  }

  return offsets;
};

/**
 * rootElement 配下のテキストノードを走査し、query に一致する箇所の Range 配列を返す。
 *
 * 制約: 要素境界をまたぐ一致は対象外(D-072)。DOM 上でリンク等によりテキストノードが
 * 分断されている場合、その境界をまたぐ語句は一致しない。テキストノード単位で
 * findMatchOffsets を適用する単純な実装にするための割り切り。
 */
export const collectMatchRanges = (rootElement: HTMLElement, query: string): Range[] => {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);

  let currentNode = walker.nextNode();
  while (currentNode !== null) {
    // NodeFilter.SHOW_TEXT で絞り込み済みのため実行時は必ず Text ノードだが、
    // TreeWalker#nextNode() の型は Node | null までしか narrow されないため
    // 型アサーションではなく instanceof で絞る
    if (currentNode instanceof Text) {
      const offsets = findMatchOffsets(currentNode.data, query);
      for (const offset of offsets) {
        const range = document.createRange();
        range.setStart(currentNode, offset.start);
        range.setEnd(currentNode, offset.end);
        ranges.push(range);
      }
    }
    currentNode = walker.nextNode();
  }

  return ranges;
};
