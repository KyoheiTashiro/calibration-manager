import { Table, TableBody, TableHead, Td, Th } from "@/components/ui/Table";
import type { CsvEntityKind } from "@/features/settings/components/csv/entityCsv";
import type { ReactElement } from "react";

import { COLUMN_REQUIREMENT_LABELS, IMPORT_CHECK_COLUMNS } from "./columns";

type Props = { kind: CsvEntityKind };

export const ImportCheckTable = ({ kind }: Props): ReactElement => (
  <Table>
    <TableHead>
      {/* 見出しは技術用語「列」を避け、CSV1行目の英語名=項目名 / 画面の表示ラベル=画面での名前 と呼ぶ(D-062) */}
      <tr>
        <Th>項目名</Th>
        <Th>画面での名前</Th>
        <Th>必須</Th>
        <Th>チェック内容</Th>
      </tr>
    </TableHead>
    <TableBody>
      {IMPORT_CHECK_COLUMNS[kind].map((column) => (
        <tr key={column.key}>
          <Td>
            <code className="rounded bg-slate-100 px-1 py-0.5">{column.key}</code>
          </Td>
          <Td>{column.label}</Td>
          <Td>{COLUMN_REQUIREMENT_LABELS[column.requirement]}</Td>
          <Td>{column.description}</Td>
        </tr>
      ))}
    </TableBody>
  </Table>
);
