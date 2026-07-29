import { Select } from "@/components/ui/Select";
import type { ReactElement } from "react";

import { buildPageItems, ELLIPSIS, PAGE_SIZE_OPTIONS } from "./pageItems";

type Props = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

// 非現在ページ・省略記号・前へ/次へで共通の枠サイズ・余白・角丸を揃えるための共通クラス
const PAGER_BUTTON_BASE_CLASS =
  "rounded h-8 min-w-8 px-2 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer inline-flex items-center justify-center";
const PAGER_BUTTON_INACTIVE_CLASS = "border border-slate-300 text-slate-700 hover:bg-slate-50";
const PAGER_BUTTON_ACTIVE_CLASS = "bg-primary text-white";

const PAGE_SIZE_SELECT_OPTIONS = PAGE_SIZE_OPTIONS.map((option) => ({
  value: String(option),
  label: `${String(option)}件`,
}));

const buildCountLabel = (totalCount: number, currentPage: number, pageSize: number): string => {
  if (totalCount === 0) return "全0件";
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);
  return `全${totalCount}件中 ${startItem}–${endItem}件目`;
};

export const Pagination = ({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: Props): ReactElement => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const countLabel = buildCountLabel(totalCount, currentPage, pageSize);
  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <nav
      aria-label="ページネーション"
      className="flex flex-wrap items-center justify-between gap-2 text-sm"
    >
      <span className="text-slate-600">{countLabel}</span>
      <div className="flex items-center gap-2">
        {/* 1ページに収まる場合もボタンは常に表示する(D-079)。0件時のみ非表示(D-077) */}
        {totalCount > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => {
                onPageChange(currentPage - 1);
              }}
              className={`${PAGER_BUTTON_BASE_CLASS} ${PAGER_BUTTON_INACTIVE_CLASS}`}
            >
              前へ
            </button>
            {pageItems.map((item, itemIndex) => {
              if (item === ELLIPSIS) {
                // なぜkeyを隣接ページ番号から作るか: 省略記号は連続する数字の間にしか
                // 現れないため「直前ページ番号-直後ページ番号」の組は配列内で一意になる。
                // 配列indexをkeyに使わず、内容（隣接するページ番号）から一意keyを導出する。
                const previousPage = pageItems[itemIndex - 1];
                const nextPage = pageItems[itemIndex + 1];
                return (
                  <span
                    key={`ellipsis-${String(previousPage)}-${String(nextPage)}`}
                    className="inline-flex h-8 min-w-8 items-center justify-center px-2"
                  >
                    …
                  </span>
                );
              }
              const isCurrent = item === currentPage;
              return (
                <button
                  key={item}
                  type="button"
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => {
                    if (!isCurrent) onPageChange(item);
                  }}
                  className={`${PAGER_BUTTON_BASE_CLASS} ${
                    isCurrent ? PAGER_BUTTON_ACTIVE_CLASS : PAGER_BUTTON_INACTIVE_CLASS
                  }`}
                >
                  {item}
                </button>
              );
            })}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => {
                onPageChange(currentPage + 1);
              }}
              className={`${PAGER_BUTTON_BASE_CLASS} ${PAGER_BUTTON_INACTIVE_CLASS}`}
            >
              次へ
            </button>
          </div>
        )}
        <div className="w-24">
          <Select
            label="1ページの表示件数"
            labelHidden
            options={PAGE_SIZE_SELECT_OPTIONS}
            value={String(pageSize)}
            onChange={(value) => {
              onPageSizeChange(Number(value));
            }}
          />
        </div>
      </div>
    </nav>
  );
};
