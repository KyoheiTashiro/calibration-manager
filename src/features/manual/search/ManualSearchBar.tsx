// oxlint-disable react/no-multi-comp -- MatchCountLabel/MatchNavigationButtons は
// ManualSearchBar 内でのみ使う小さな表示専用の内部部品のため同ファイルに置く
import type { KeyboardEvent, ReactElement, RefObject } from "react";

import { useManualSearch } from "./useManualSearch";

type Props = { contentRef: RefObject<HTMLElement | null> };

/* 件数表示。query が空のときは非表示にする(検索前は案内不要なため)。
   aria-live="polite" で件数変化をスクリーンリーダーに通知する。 */
const MatchCountLabel = ({
  matchCount,
  currentMatchNumber,
}: {
  matchCount: number;
  currentMatchNumber: number;
}): ReactElement => (
  <span aria-live="polite" className="text-sm whitespace-nowrap text-slate-600">
    {matchCount === 0 ? "一致なし" : `${String(currentMatchNumber)} / ${String(matchCount)} 件`}
  </span>
);

/*
 * 「前へ」「次へ」ボタン。src/components/ui/Button は variant が primary/secondary/danger
 * のみで、この検索バーのような小さな補助操作向けの見た目がないため、素の <button> に
 * TextField 等と同系のボーダースタイルを直接当てる。
 */
const MatchNavigationButtons = ({
  matchCount,
  onMoveToPrevious,
  onMoveToNext,
}: {
  matchCount: number;
  onMoveToPrevious: () => void;
  onMoveToNext: () => void;
}): ReactElement => {
  const buttonClassName = "rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        aria-label="前の一致へ"
        className={buttonClassName}
        disabled={matchCount === 0}
        onClick={onMoveToPrevious}
      >
        前へ
      </button>
      <button
        type="button"
        aria-label="次の一致へ"
        className={buttonClassName}
        disabled={matchCount === 0}
        onClick={onMoveToNext}
      >
        次へ
      </button>
    </>
  );
};

export const ManualSearchBar = ({ contentRef }: Props): ReactElement => {
  const {
    query,
    matchCount,
    currentMatchNumber,
    handleQueryChange,
    moveToNextMatch,
    moveToPreviousMatch,
    clearSearch,
  } = useManualSearch(contentRef);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        moveToPreviousMatch();
      } else {
        moveToNextMatch();
      }
      return;
    }

    if (event.key === "Escape") {
      clearSearch();
    }
  };

  return (
    // なぜ sticky か: 一致間をジャンプしている間も検索フィールド・件数・操作ボタンを
    // 見えたままにするため。スクロールコンテナはレイアウトの main 要素。
    <div className="sticky top-0 z-10 -my-1 bg-white py-2">
      <div className="flex items-center gap-2">
        <input
          type="search"
          aria-label="マニュアル内検索"
          placeholder="マニュアル内を検索"
          className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm"
          value={query}
          onChange={(event) => {
            handleQueryChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
        />
        <MatchNavigationButtons
          matchCount={matchCount}
          onMoveToPrevious={moveToPreviousMatch}
          onMoveToNext={moveToNextMatch}
        />
        {query !== "" && (
          <MatchCountLabel matchCount={matchCount} currentMatchNumber={currentMatchNumber} />
        )}
      </div>
    </div>
  );
};
