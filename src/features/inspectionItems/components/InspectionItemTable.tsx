/**
 * 項目一覧(screen-design/05-inspection-item-list.md)のテーブル。
 * 行データ・並び(nextDueDate 昇順)は inspectionItemRowsOf(store/selectors)/filterInspectionItemRows(hooks)で確定済みのため、
 * ここは列描画と行アクション(記録/案件/編集)の起動通知だけを担う薄いビュー。
 * 「案件」は row.canCreateOrder=true(外部かつ有効案件なし)の行のみ表示する(§5)。
 */

import { StatusBadge } from "@/components/domain";
import { Button, Table, TableBody, TableHead } from "@/components/ui";
import { CYCLE_LABELS, EXECUTION_LABELS, INSPECTION_ITEM_TYPE_LABELS } from "@/features/inspectionItems/constants";
import type { InspectionItemRow } from "@/store/selectors";
import type { ReactElement } from "react";

type Props = {
  rows: readonly InspectionItemRow[];
  onRecord: (row: InspectionItemRow) => void;
  onOrder: (row: InspectionItemRow) => void;
  onEdit: (row: InspectionItemRow) => void;
};

export const InspectionItemTable = ({ rows, onRecord, onOrder, onEdit }: Props): ReactElement => (
  <Table>
    <TableHead>
      <tr>
        <th scope="col" className="px-3 py-2 text-left">
          ステータス
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          管理番号
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          機器名
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          項目名
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          種別
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          内外
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          周期
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          担当
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          最終実施日
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          次回期限
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          発注推奨日
        </th>
        <th scope="col" className="px-3 py-2 text-left">
          操作
        </th>
      </tr>
    </TableHead>
    <TableBody>
      {rows.map((row) => (
        <tr key={row.inspectionItem.id}>
          <td className="px-3 py-2">
            <StatusBadge status={row.status} />
          </td>
          <td className="px-3 py-2">{row.equipment.managementNo}</td>
          <td className="px-3 py-2">{row.equipment.name}</td>
          <td className="px-3 py-2">{row.inspectionItem.name}</td>
          <td className="px-3 py-2">{INSPECTION_ITEM_TYPE_LABELS[row.inspectionItem.type]}</td>
          <td className="px-3 py-2">{EXECUTION_LABELS[row.inspectionItem.execution]}</td>
          <td className="px-3 py-2">{CYCLE_LABELS[row.inspectionItem.cycle]}</td>
          <td className="px-3 py-2">{row.personLabel}</td>
          <td className="px-3 py-2">{row.inspectionItem.lastDoneDate ?? "—"}</td>
          <td className="px-3 py-2">{row.inspectionItem.nextDueDate}</td>
          <td className="px-3 py-2">{row.recommendedOrderDate ?? "—"}</td>
          {/* なぜ td を flex 化して直下に Button を並べるか: equipment/detail と同様、
              div ラップだと jsx-a11y のボタンラベル探索深度を超えるため。 */}
          <td className="flex gap-2 px-3 py-2">
            <Button variant="secondary" size="sm" onClick={() => onRecord(row)}>
              記録
            </Button>
            {row.canCreateOrder ? (
              <Button variant="secondary" size="sm" onClick={() => onOrder(row)}>
                案件
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => onEdit(row)}>
              編集
            </Button>
          </td>
        </tr>
      ))}
    </TableBody>
  </Table>
);
