import type { KeyboardEvent, ReactElement, RefObject } from "react";

import { useManualSearch } from "./useManualSearch";

type Props = { contentRef: RefObject<HTMLElement | null> };

/*
 * 「前へ」「次へ」ボタンは src/components/ui/Button を使わない: variant が
 * primary/secondary/danger のみで、この検索バーのような小さな補助操作向けの見た目が
 * ないため、素の <button> に TextField 等と同系のボーダースタイルを直接当てる。
 */
const navigationButtonClassName =
  "rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-50";

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
        <button
          type="button"
          aria-label="前の一致へ"
          className={navigationButtonClassName}
          disabled={matchCount === 0}
          onClick={moveToPreviousMatch}
        >
          前へ
        </button>
        <button
          type="button"
          aria-label="次の一致へ"
          className={navigationButtonClassName}
          disabled={matchCount === 0}
          onClick={moveToNextMatch}
        >
          次へ
        </button>
        {/* 件数表示。query が空のときは非表示(検索前は案内不要なため)。
            aria-live="polite" で件数変化をスクリーンリーダーに通知する。 */}
        {query !== "" && (
          <span aria-live="polite" className="text-sm whitespace-nowrap text-slate-600">
            {matchCount === 0
              ? "一致なし"
              : `${String(currentMatchNumber)} / ${String(matchCount)} 件`}
          </span>
        )}
      </div>
    </div>
  );
};
