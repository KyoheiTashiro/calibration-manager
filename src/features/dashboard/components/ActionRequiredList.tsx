/**
 * ダッシュボードの要対応項目リスト(01-dashboard.md)。
 * 行データ・並び(優先度順)は hooks.ts の actionRequiredRows で確定済みのため、
 * ここは列描画と行アクティベート(クリック/Enter/Space で機器詳細へ遷移。D-026)のみを担う薄いビュー。
 */

import { StatusBadge } from "@/components/domain";
import {
  EmptyState,
  Table,
  TableBody,
  TableHead,
  Td,
  Th,
  activatableRowProps,
} from "@/components/ui";
import { equipmentDetailPath } from "@/constants/routes";
import { SERVICE_ITEM_TYPE_LABELS } from "@/features/serviceItems/constants";
import type { ServiceItemRow } from "@/store/selectors";
import type { ReactElement } from "react";

type Props = {
  rows: readonly ServiceItemRow[];
  /** 遷移実行(useNavigate をそのまま渡す)。機器詳細への実パスを渡す */
  onNavigate: (path: string) => void;
};

export const ActionRequiredList = ({ rows, onNavigate }: Props): ReactElement => {
  if (rows.length === 0) return <EmptyState message="対応が必要な項目はありません" />;

  const activate = (equipmentId: string): void => {
    onNavigate(equipmentDetailPath(equipmentId));
  };

  return (
    <Table>
      <TableHead>
        <tr>
          <Th>状態</Th>
          <Th>管理番号</Th>
          <Th>機器名</Th>
          <Th>項目名</Th>
          <Th>種別</Th>
          <Th>担当</Th>
          <Th>次回期限</Th>
        </tr>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <tr
            key={row.serviceItem.id}
            {...activatableRowProps(() => {
              activate(row.equipment.id);
            })}
          >
            <Td>
              <StatusBadge status={row.status} />
            </Td>
            <Td>{row.equipment.managementNo}</Td>
            <Td>{row.equipment.name}</Td>
            <Td>{row.serviceItem.name}</Td>
            <Td>{SERVICE_ITEM_TYPE_LABELS[row.serviceItem.type]}</Td>
            <Td>{row.personLabel}</Td>
            <Td>{row.serviceItem.nextDueDate}</Td>
          </tr>
        ))}
      </TableBody>
    </Table>
  );
};
