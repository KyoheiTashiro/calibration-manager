/**
 * 項目一覧(screen-design/05-service-item-list.md)のテーブル。
 * 行データ・並び(nextDueDate 昇順)は serviceItemRowsOf(store/selectors)/filterServiceItemRows(hooks)で確定済みのため、
 * ここは列描画と行アクション(記録/案件/編集)の起動通知だけを担う薄いビュー。
 * 「案件」は row.canCreateServiceOrder=true(外部かつ有効案件なし)の行のみ表示する(§5)。
 */

import { StatusBadge } from "@/components/domain";
import { Button, Table, TableBody, TableHead, Td, Th } from "@/components/ui";
import {
  CYCLE_LABELS,
  EXECUTION_LABELS,
  SERVICE_ITEM_TYPE_LABELS,
} from "@/features/serviceItems/constants";
import type { ServiceItemRow } from "@/store/selectors";
import type { ReactElement } from "react";

type Props = {
  rows: readonly ServiceItemRow[];
  onRecord: (row: ServiceItemRow) => void;
  onOrder: (row: ServiceItemRow) => void;
  onEdit: (row: ServiceItemRow) => void;
};

export const ServiceItemTable = ({ rows, onRecord, onOrder, onEdit }: Props): ReactElement => (
  <Table>
    <TableHead>
      <tr>
        <Th>ステータス</Th>
        <Th>管理番号</Th>
        <Th>機器名</Th>
        <Th>項目名</Th>
        <Th>種別</Th>
        <Th>内外</Th>
        <Th>周期</Th>
        <Th>担当</Th>
        <Th>最終実施日</Th>
        <Th>次回期限</Th>
        <Th>発注推奨日</Th>
        <Th>操作</Th>
      </tr>
    </TableHead>
    <TableBody>
      {rows.map((row) => (
        <tr key={row.serviceItem.id}>
          <Td>
            <StatusBadge status={row.status} />
          </Td>
          <Td>{row.equipment.managementNo}</Td>
          <Td>{row.equipment.name}</Td>
          <Td>{row.serviceItem.name}</Td>
          <Td>{SERVICE_ITEM_TYPE_LABELS[row.serviceItem.type]}</Td>
          <Td>{EXECUTION_LABELS[row.serviceItem.execution]}</Td>
          <Td>{CYCLE_LABELS[row.serviceItem.cycle]}</Td>
          <Td>{row.personLabel}</Td>
          <Td>{row.serviceItem.lastDoneDate ?? "—"}</Td>
          <Td>{row.serviceItem.nextDueDate}</Td>
          <Td>{row.recommendedOrderDate ?? "—"}</Td>
          {/* なぜ td を flex 化して直下に Button を並べるか: equipment/detail と同様、
              div ラップだと jsx-a11y のボタンラベル探索深度を超えるため。 */}
          <Td className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onRecord(row);
              }}
            >
              記録
            </Button>
            {row.canCreateServiceOrder ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onOrder(row);
                }}
              >
                案件
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onEdit(row);
              }}
            >
              編集
            </Button>
          </Td>
        </tr>
      ))}
    </TableBody>
  </Table>
);
