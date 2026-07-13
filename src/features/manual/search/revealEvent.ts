/* 検索ジャンプ先が hidden な要素(非アクティブタブのパネル等)の中にあるとき、
   その要素を表示するよう所有側コンポーネントへ求める合図(D-073)。
   バブリングさせ、所有側(ImportCheckTabs 等)がコンテナで購読して自分の
   ローカル state(アクティブタブ)を切り替える。検索側はタブの存在を知らない。 */
export const SEARCH_REVEAL_EVENT = "manual-search-reveal";

export const dispatchSearchReveal = (hiddenElement: HTMLElement): void => {
  hiddenElement.dispatchEvent(new CustomEvent(SEARCH_REVEAL_EVENT, { bubbles: true }));
};
