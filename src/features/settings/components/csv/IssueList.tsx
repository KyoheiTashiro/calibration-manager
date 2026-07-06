/**
 * CSVインポートプレビューのエラー一覧・警告一覧(§11)。
 * 両者は見出し+行番号付きリストの同型のため ImportSection.tsx から抽出。
 */

import type { ImportRowError } from "@/features/settings/components/csv/importValidation";
import type { ReactElement } from "react";

type Props = {
  /** 見出し行(例: 「✗ 2行 エラー」)のテキスト */
  heading: string;
  headingClassName: string;
  listClassName: string;
  items: ImportRowError[];
};

export const IssueList = ({
  heading,
  headingClassName,
  listClassName,
  items,
}: Props): ReactElement => (
  <>
    <p className={headingClassName}>{heading}</p>
    <ul className={listClassName}>
      {items.map((item) => (
        <li key={`${item.line}-${item.message}`}>
          行{item.line}: {item.message}
        </li>
      ))}
    </ul>
  </>
);
