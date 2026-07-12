import { Table, TableBody, TableHead, Td, Th } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import {
  CSV_ENTITY_KINDS,
  type CsvEntityKind,
  ENTITY_CSV_SPECS,
} from "@/features/settings/components/csv/entityCsv";
import { useState, type ReactElement } from "react";

import { COLUMN_REQUIREMENT_LABELS, IMPORT_CHECK_COLUMNS } from "./columns";

/** タブの並びは CSV_ENTITY_KINDS(推奨インポート順)と共通。マニュアル本文の記載と一致させる(D-058 / D-060) */
const TABS = CSV_ENTITY_KINDS.map((kind) => ({ key: kind, label: ENTITY_CSV_SPECS[kind].label }));

const isCsvEntityKind = (key: string): key is CsvEntityKind =>
  (CSV_ENTITY_KINDS as readonly string[]).includes(key);

export const ImportCheckTabs = (): ReactElement => {
  const [activeKind, setActiveKind] = useState<CsvEntityKind>(CSV_ENTITY_KINDS[0]);

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        tabs={TABS}
        activeKey={activeKind}
        onChange={(key) => {
          if (isCsvEntityKind(key)) setActiveKind(key);
        }}
      />
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
          {IMPORT_CHECK_COLUMNS[activeKind].map((column) => (
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
    </div>
  );
};
