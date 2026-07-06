/**
 * CSVインポートプレビューのエラー一覧・警告一覧(§11)。
 * 両者は見出し+行番号付きリストの同型のため ImportSection.tsx から抽出。
 * 見た目の違いは色調(tone)のみのため、クラス名2つの受け渡しではなく tone 1 つに集約する。
 * なぜ tone の as-const オブジェクトをここで export しないか: oxlint の
 * react/only-export-components は「コンポーネントを export するファイルは他の値を export しない」
 * ことを要求する(Fast Refresh 対応)。ここでは型のみ export し、値そのもの(ISSUE_TONE 相当)は
 * 呼び出し側(ImportSection.tsx)が as-const 定数として持つ。
 */

import type { ImportRowError } from "@/features/settings/components/csv/importValidation";
import type { ReactElement } from "react";

const TONE = { ERROR: "error", WARNING: "warning" } as const;
export type IssueTone = (typeof TONE)[keyof typeof TONE];

const TONE_CLASSES: Record<IssueTone, { heading: string; list: string }> = {
  [TONE.ERROR]: {
    heading: "text-danger",
    list: "text-danger flex flex-col gap-0.5",
  },
  [TONE.WARNING]: {
    heading: "text-amber-600",
    list: "flex flex-col gap-0.5 text-amber-600",
  },
};

type Props = {
  /** 見出し行(例: 「✗ 2行 エラー」)のテキスト */
  heading: string;
  tone: IssueTone;
  items: ImportRowError[];
};

export const IssueList = ({ heading, tone, items }: Props): ReactElement => {
  const { heading: headingClassName, list: listClassName } = TONE_CLASSES[tone];
  return (
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
};
