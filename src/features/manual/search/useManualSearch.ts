import { useEffect, useState, type RefObject } from "react";

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
  range.startContainer.parentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
};

/* CSS Custom Highlight API に対応しているか判定する。非対応ブラウザではハイライト表示を
   諦め、検索・ジャンプ機能のみ提供する(段階的機能低下)。 */
const isHighlightApiSupported = (): boolean =>
  typeof Highlight !== "undefined" && typeof CSS !== "undefined" && "highlights" in CSS;

/* matches・currentIndex の変化に応じてハイライト登録を同期する。
   なぜ effect 分割か: 「登録」と「アンマウント時の後始末」の責務を分け、
   後始末は依存配列を空にして一度だけ登録することを明確にするため。 */
const useHighlightRegistration = (matches: Range[], currentIndex: number): void => {
  useEffect(() => {
    if (!isHighlightApiSupported()) {
      return;
    }

    if (matches.length === 0) {
      CSS.highlights.delete(MANUAL_SEARCH_HIGHLIGHT.MATCH);
      CSS.highlights.delete(MANUAL_SEARCH_HIGHLIGHT.CURRENT);
      return;
    }

    CSS.highlights.set(MANUAL_SEARCH_HIGHLIGHT.MATCH, new Highlight(...matches));

    const currentRange = matches[currentIndex];
    if (currentRange === undefined) {
      CSS.highlights.delete(MANUAL_SEARCH_HIGHLIGHT.CURRENT);
    } else {
      CSS.highlights.set(MANUAL_SEARCH_HIGHLIGHT.CURRENT, new Highlight(currentRange));
    }
  }, [matches, currentIndex]);

  useEffect(
    () => (): void => {
      if (!isHighlightApiSupported()) {
        return;
      }
      CSS.highlights.delete(MANUAL_SEARCH_HIGHLIGHT.MATCH);
      CSS.highlights.delete(MANUAL_SEARCH_HIGHLIGHT.CURRENT);
    },
    [],
  );
};

/*
 * マニュアル内検索(D-072)。既知の制約: マニュアル内のタブ切替(ImportCheckTabs)などで
 * 検索対象の DOM が変わっても matches は自動再計算しない。次に検索語を入力し直した
 * タイミングで再計算される割り切り。
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

    const [firstMatch] = nextMatches;
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

    const nextRange = matches[nextIndex];
    if (nextRange !== undefined) {
      scrollToRange(nextRange);
    }
  };

  const moveToNextMatch = (): void => {
    moveToMatch(1);
  };

  const moveToPreviousMatch = (): void => {
    moveToMatch(-1);
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
    moveToNextMatch,
    moveToPreviousMatch,
    clearSearch,
  };
};
