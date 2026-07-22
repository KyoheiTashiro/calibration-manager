import { useEffect, useState, type RefObject } from "react";

import { dispatchSearchReveal } from "./revealEvent";
import { collectMatchRanges } from "./textSearch";

/* CSS Custom Highlight API の ::highlight() 名。src/styles/index.css の定義と一致させること。 */
export const MANUAL_SEARCH_HIGHLIGHT = {
  MATCH: "manual-search-match",
  CURRENT: "manual-search-current",
} as const;

type ManualSearchState = {
  query: string;
  matchCount: number;
  /** 1始まりの表示用。一致なしは 0 */
  currentMatchNumber: number;
  handleQueryChange: (query: string) => void;
  moveToNextMatch: () => void;
  moveToPreviousMatch: () => void;
  clearSearch: () => void;
};

/* このアプリのスクロールコンテナは window ではなくレイアウトの main 要素のため、
   window.scrollTo ではなく目次(TocFab)と同じ scrollIntoView 方式を使う。
   center 指定は、ジャンプ先が画面上端ぎりぎりで見切れないようにするため。 */
const scrollToRange = (range: Range): void => {
  const { parentElement } = range.startContainer;
  if (parentElement === null) {
    return;
  }

  const scroll = (): void => {
    parentElement.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const hiddenAncestor = parentElement.closest<HTMLElement>("[hidden]");
  if (hiddenAncestor === null) {
    scroll();
    return;
  }

  // hidden なパネル内へのジャンプ: 表示を所有側に依頼し、React の state 更新が
  // commit された後(マクロタスク)にスクロールする
  dispatchSearchReveal(hiddenAncestor);
  globalThis.setTimeout(scroll, 0);
};

/* CSS Custom Highlight API に対応しているか判定する。非対応ブラウザではハイライト表示を
   諦め、検索・ジャンプ機能のみ提供する(段階的機能低下)。 */
const isHighlightApiSupported = (): boolean =>
  typeof Highlight !== "undefined" && typeof CSS !== "undefined" && "highlights" in CSS;

/* matches・currentIndex の変化に応じてハイライト登録を同期する。
   cleanup は再実行前・アンマウント時に必ず走るため、削除は cleanup に一本化する。 */
const useHighlightRegistration = (matches: Range[], currentIndex: number): void => {
  useEffect(() => {
    if (!isHighlightApiSupported() || matches.length === 0) {
      return;
    }

    CSS.highlights.set(MANUAL_SEARCH_HIGHLIGHT.MATCH, new Highlight(...matches));

    /* なぜ .at() か: noUncheckedIndexedAccess 無効のため添字アクセスは undefined を含まない
       型になり、undefined ガードが lint(no-unnecessary-condition)と矛盾する。
       .at() は `Range | undefined` を返すためガードと整合する(以下同様)。
       currentIndex >= 0 ガードは .at(-1) が末尾要素を返すため必須。 */
    const currentRange = currentIndex >= 0 ? matches.at(currentIndex) : undefined;
    if (currentRange !== undefined) {
      CSS.highlights.set(MANUAL_SEARCH_HIGHLIGHT.CURRENT, new Highlight(currentRange));
    }

    return (): void => {
      /* cleanup 時にも再判定する: テスト等で CSS.highlights のスタブが
         effect 実行後〜cleanup 前に解除されるケースがあるため */
      if (!isHighlightApiSupported()) {
        return;
      }
      CSS.highlights.delete(MANUAL_SEARCH_HIGHLIGHT.MATCH);
      CSS.highlights.delete(MANUAL_SEARCH_HIGHLIGHT.CURRENT);
    };
  }, [matches, currentIndex]);
};

/*
 * マニュアル内検索(D-072)。ImportCheckTabs は全パネルを hidden で DOM に保持するため
 * (D-073)、タブ切替で Range は失効しない。
 */
export const useManualSearch = (contentRef: RefObject<HTMLElement | null>): ManualSearchState => {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Range[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useHighlightRegistration(matches, currentIndex);

  const handleQueryChange = (nextQuery: string): void => {
    setQuery(nextQuery);

    const contentElement = contentRef.current;
    const nextMatches =
      contentElement === null ? [] : collectMatchRanges(contentElement, nextQuery);
    setMatches(nextMatches);

    const nextIndex = nextMatches.length > 0 ? 0 : -1;
    setCurrentIndex(nextIndex);

    const firstMatch = nextMatches.at(0);
    if (firstMatch !== undefined) {
      scrollToRange(firstMatch);
    }
  };

  const moveToMatch = (step: 1 | -1): void => {
    if (matches.length === 0) {
      return;
    }

    const nextIndex = (currentIndex + step + matches.length) % matches.length;
    setCurrentIndex(nextIndex);

    const nextRange = matches.at(nextIndex);
    if (nextRange !== undefined) {
      scrollToRange(nextRange);
    }
  };

  const clearSearch = (): void => {
    setQuery("");
    setMatches([]);
    setCurrentIndex(-1);
  };

  return {
    query,
    matchCount: matches.length,
    currentMatchNumber: currentIndex === -1 ? 0 : currentIndex + 1,
    handleQueryChange,
    moveToNextMatch: (): void => {
      moveToMatch(1);
    },
    moveToPreviousMatch: (): void => {
      moveToMatch(-1);
    },
    clearSearch,
  };
};
