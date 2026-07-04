/**
 * ダッシュボードの要対応項目リスト(01-dashboard.md)。
 * 行データ・並び(優先度順)は hooks.ts の actionRequiredRows で確定済みのため、
 * ここは列描画と行アクティベート(クリック/Enter/Space で機器詳細へ遷移。D-026)のみを担う薄いビュー。
 */

import { StatusBadge } from "@/components/domain";
import { EmptyState, Table, TableBody, TableHead } from "@/components/ui";
import { equipmentDetailPath } from "@/constants/routes";
import { INSPECTION_ITEM_TYPE_LABELS } from "@/features/inspectionItems/constants";
import type { InspectionItemRow } from "@/store/selectors";
import type { KeyboardEvent, ReactElement } from "react";

type Props = {
  rows: readonly InspectionItemRow[];
  /** 遷移実行(useNavigate をそのまま渡す)。機器詳細への実パスを渡す */
  onNavigate: (path: string) => void;
};

export const ActionRequiredList = ({ rows, onNavigate }: Props): ReactElement => {
  if (rows.length === 0) return <EmptyState message="対応が必要な項目はありません" />;

  const activate = (equipmentId: string): void => {
    onNavigate(equipmentDetailPath(equipmentId));
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, equipmentId: string): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate(equipmentId);
  };

  return (
    <Table>
      <TableHead>
        <tr>
          <th scope="col" className="px-3 py-2 text-left">
            状態
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
            担当
          </th>
          <th scope="col" className="px-3 py-2 text-left">
            次回期限
          </th>
        </tr>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <tr
            key={row.inspectionItem.id}
            tabIndex={0}
            onClick={() => {
              activate(row.equipment.id);
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, row.equipment.id);
            }}
            className="cursor-pointer hover:bg-slate-50"
          >
            <td className="px-3 py-2">
              <StatusBadge status={row.status} />
            </td>
            <td className="px-3 py-2">{row.equipment.managementNo}</td>
            <td className="px-3 py-2">{row.equipment.name}</td>
            <td className="px-3 py-2">{row.inspectionItem.name}</td>
            <td className="px-3 py-2">{INSPECTION_ITEM_TYPE_LABELS[row.inspectionItem.type]}</td>
            <td className="px-3 py-2">{row.personLabel}</td>
            <td className="px-3 py-2">{row.inspectionItem.nextDueDate}</td>
          </tr>
        ))}
      </TableBody>
    </Table>
  );
};
