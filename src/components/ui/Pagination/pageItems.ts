/**
 * ページネーションのページ番号列を組み立てる純関数。
 * 表示規則（screen-design/README.md §0.8 D-076・D-080）: 表示スロット数を固定し、
 * ページ移動でボタン列の幅が伸縮しないようにする（レイアウトシフト防止）。
 * 端に近いときは省略記号の代わりにページ番号で埋め、省略記号が1ページしか
 * 隠さない状況も作らない（MUI usePagination と同じ規則）。
 *
 * 表示件数の定数もこのファイルに置く（Pagination.tsx はコンポーネント本体のみを
 * exportする方針のため。react/only-export-components 対策）。
 */
export const ELLIPSIS = 'ellipsis' as const;
export type PageItem = number | typeof ELLIPSIS;

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSizeOption = 20;

/** 現在ページの左右に常に表示する隣接ページ数 */
const SIBLING_COUNT = 2;
/** 先頭・末尾に常に表示するページ数 */
const BOUNDARY_COUNT = 1;
/** 固定スロット数 = 両端 + 隣接 + 現在ページ + 省略記号枠×2 */
const TOTAL_SLOT_COUNT = BOUNDARY_COUNT * 2 + SIBLING_COUNT * 2 + 3;

const buildRange = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_item, index) => start + index);

export const buildPageItems = (currentPage: number, totalPages: number): PageItem[] => {
  if (totalPages <= TOTAL_SLOT_COUNT) {
    return buildRange(1, totalPages);
  }
  const clampedCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  // 隣接範囲は「現在ページ±SIBLING_COUNT」を基本に、端では反対側へ広げて
  // 常に同じスロット数を維持する
  const siblingsStart = Math.max(
    Math.min(
      clampedCurrentPage - SIBLING_COUNT,
      totalPages - BOUNDARY_COUNT - SIBLING_COUNT * 2 - 1,
    ),
    BOUNDARY_COUNT + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(clampedCurrentPage + SIBLING_COUNT, BOUNDARY_COUNT + SIBLING_COUNT * 2 + 2),
    totalPages - BOUNDARY_COUNT - 1,
  );

  return [
    ...buildRange(1, BOUNDARY_COUNT),
    // 省略記号が隠すページが1つだけならページ番号をそのまま表示する
    siblingsStart > BOUNDARY_COUNT + 2 ? ELLIPSIS : BOUNDARY_COUNT + 1,
    ...buildRange(siblingsStart, siblingsEnd),
    siblingsEnd < totalPages - BOUNDARY_COUNT - 1 ? ELLIPSIS : totalPages - BOUNDARY_COUNT,
    ...buildRange(totalPages - BOUNDARY_COUNT + 1, totalPages),
  ];
};
