import { useState } from "react";

import { DEFAULT_PAGE_SIZE } from "./pageItems";

type UsePaginationResult<Item> = {
  /** クランプ済みの現在ページ(1始まり)。Pagination の page にそのまま渡す */
  page: number;
  pageSize: number;
  totalCount: number;
  /** 現在ページに表示する要素(検索・フィルタ・並び順適用後のリストの一部分) */
  pagedItems: Item[];
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
};

/**
 * ページネーションの状態管理フック(screen-design/README.md §0.8 D-076)。
 * 検索・フィルタ・タブ・並び順を適用した後の結果リストを受け取りページ分割する。
 *
 * - `resetKey` の変化で1ページ目へ戻る(検索語・フィルタ・タブの変更時リセット用。
 *   呼び出し側はフィルタ値を連結した文字列などを渡す)
 * - データ増減で現在ページが範囲外になった場合は最終ページへ丸める
 * - 表示件数の変更時は1ページ目へ戻る
 */
export const usePagination = <Item>(
  items: readonly Item[],
  resetKey = "",
): UsePaginationResult<Item> => {
  const [page, setPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);

  // なぜレンダー中に前回値比較でリセットするか: useEffect だと旧ページのまま
  // 1フレーム描画されてちらつくため。propsに応じたstate調整のReact公式パターン。
  const [previousResetKey, setPreviousResetKey] = useState(resetKey);
  if (resetKey !== previousResetKey) {
    setPreviousResetKey(resetKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSizeState));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const setPageSize = (nextPageSize: number): void => {
    setPageSizeState(nextPageSize);
    setPage(1);
  };

  return {
    page: currentPage,
    pageSize: pageSizeState,
    totalCount: items.length,
    pagedItems: items.slice((currentPage - 1) * pageSizeState, currentPage * pageSizeState),
    setPage,
    setPageSize,
  };
};
