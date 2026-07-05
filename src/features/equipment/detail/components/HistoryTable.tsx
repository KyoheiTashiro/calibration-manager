/**
 * 機器詳細画面（screen-design/04-equipment-detail.md）の実施記録テーブル
 * （全項目横断・新しい順）。0件時はEmptyStateを表示する。並び順は呼び出し側(hooks.ts)で確定済み。
 */

import { EmptyState, Table, TableBody, TableHead } from "@/components/ui";
import type { HistoryRow } from "@/features/equipment/detail/hooks";
import { RECORD_RESULT_LABELS } from "@/features/serviceItems/constants";
import type { ReactElement } from "react";

type Props = {
  historyRows: readonly HistoryRow[];
};

export const HistoryTable = ({ historyRows }: Props): ReactElement =>
  historyRows.length === 0 ? (
    <EmptyState message="実施記録が未登録です" />
  ) : (
    <Table>
      <TableHead>
        <tr>
          <th scope="col" className="px-3 py-2 text-left">
            実施日
          </th>
          <th scope="col" className="px-3 py-2 text-left">
            項目名
          </th>
          <th scope="col" className="px-3 py-2 text-left">
            実施者
          </th>
          <th scope="col" className="px-3 py-2 text-left">
            結果
          </th>
          <th scope="col" className="px-3 py-2 text-left">
            備考
          </th>
        </tr>
      </TableHead>
      <TableBody>
        {historyRows.map(({ record, serviceItemName }) => (
          <tr key={record.id}>
            <td className="px-3 py-2">{record.doneDate}</td>
            <td className="px-3 py-2">{serviceItemName}</td>
            <td className="px-3 py-2">{record.doneBy}</td>
            <td className="px-3 py-2">{RECORD_RESULT_LABELS[record.result]}</td>
            <td className="px-3 py-2">{record.note ?? "—"}</td>
          </tr>
        ))}
      </TableBody>
    </Table>
  );
