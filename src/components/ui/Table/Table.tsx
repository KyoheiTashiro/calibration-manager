import type { ReactElement, ReactNode } from "react";

// oxlint-disable react/no-multi-comp -- Table/TableHead/TableBody/Th/Tdは<table><thead><tbody>と
// そのセル(<th>/<td>)を一体で扱う複合コンポーネントであり、directory-structure.md の指定通り
// 1ファイルから複数のnamed exportを提供する構成が正しい設計判断のため、このファイル内に限りルールを緩和する。

// なぜ: ui-guidelines.md §6「横スクロール」— 列数が多い一覧でもページ全体は横スクロールさせず、
// テーブル本体のみをコンテナ内でスクロールさせる（WCAG 1.4.10 のデータテーブル例外対応）。
type TableProps = {
  children: ReactNode;
  className?: string;
};

export const Table = ({ children, className }: TableProps): ReactElement => {
  const tableClassName = ["w-full border-collapse text-sm", className].filter(Boolean).join(" ");

  return (
    <div className="overflow-x-auto">
      <table className={tableClassName}>{children}</table>
    </div>
  );
};

// なぜ: ui-guidelines.md §6「配色」— ヘッダー行は bg-slate-50 text-slate-600 text-xs font-medium。
type TableHeadProps = {
  children: ReactNode;
};

export const TableHead = ({ children }: TableHeadProps): ReactElement => (
  <thead className="bg-slate-50 text-xs font-medium text-slate-600">{children}</thead>
);

// なぜ: ui-guidelines.md §6「配色」— 罫線は border-slate-200 の横線のみで縦罫線は原則引かない。
// divide-y divide-slate-200 により行間の横罫線のみを表現する。
type TableBodyProps = {
  children: ReactNode;
};

export const TableBody = ({ children }: TableBodyProps): ReactElement => (
  <tbody className="divide-y divide-slate-200">{children}</tbody>
);

// なぜ: ui-guidelines.md §6「レイアウト」— セルの余白は px-3 py-2 に統一。右寄せ数値列のみ text-right。
type ThProps = { children: ReactNode; align?: "left" | "right" };

export const Th = ({ children, align = "left" }: ThProps): ReactElement => (
  <th scope="col" className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"}`}>
    {children}
  </th>
);

type TdProps = { children?: ReactNode; className?: string };

export const Td = ({ children, className }: TdProps): ReactElement => (
  <td className={["px-3 py-2", className].filter(Boolean).join(" ")}>{children}</td>
);
