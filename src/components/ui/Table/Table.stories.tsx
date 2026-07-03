import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";

import { Table, TableBody, TableHead } from "./Table";

const meta = {
  title: "UI/Table",
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;

const SAMPLE_ROWS = [
  { id: "1", name: "デジタルノギス", location: "第1工場", status: "OK" },
  { id: "2", name: "トルクレンチ", location: "第2工場", status: "要発注" },
  { id: "3", name: "温湿度計", location: "本社", status: "校正中" },
] as const;

export const Sample: StoryObj<typeof meta> = {
  // なぜargsが必要か: renderで独自のテーブル構造を描画するため個々のargsは使わないが、
  // StoryObjの型上componentが要求するargsを満たす必要があるため代表値を渡す。
  args: {
    children: null,
  },
  render: (): ReactElement => (
    <Table>
      <TableHead>
        <tr>
          <th className="px-3 py-2 text-left">機器名</th>
          <th className="px-3 py-2 text-left">設置場所</th>
          <th className="px-3 py-2 text-left">ステータス</th>
        </tr>
      </TableHead>
      <TableBody>
        {SAMPLE_ROWS.map((row) => (
          <tr key={row.id}>
            <td className="px-3 py-2">{row.name}</td>
            <td className="px-3 py-2">{row.location}</td>
            <td className="px-3 py-2">{row.status}</td>
          </tr>
        ))}
      </TableBody>
    </Table>
  ),
};

const WIDE_COLUMN_LABELS = [
  "機器名",
  "型式",
  "製造番号",
  "設置場所",
  "担当者",
  "校正周期",
  "前回校正日",
  "次回校正日",
  "ステータス",
] as const;

// なぜ: ui-guidelines.md §6の横スクロール仕様を確認するため、
// 意図的に8列超の広いテーブルを用意する。
export const WideScrollable: StoryObj<typeof meta> = {
  // なぜargsが必要か: renderで独自のテーブル構造を描画するため個々のargsは使わないが、
  // StoryObjの型上componentが要求するargsを満たす必要があるため代表値を渡す。
  args: {
    children: null,
  },
  render: (): ReactElement => (
    <Table>
      <TableHead>
        <tr>
          {WIDE_COLUMN_LABELS.map((label) => (
            <th key={label} className="px-3 py-2 text-left whitespace-nowrap">
              {label}
            </th>
          ))}
        </tr>
      </TableHead>
      <TableBody>
        <tr>
          {WIDE_COLUMN_LABELS.map((label) => (
            <td key={label} className="px-3 py-2 whitespace-nowrap">
              サンプル値
            </td>
          ))}
        </tr>
      </TableBody>
    </Table>
  ),
};
