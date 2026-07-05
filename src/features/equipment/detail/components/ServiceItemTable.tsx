/**
 * 機器詳細画面（screen-design/04-equipment-detail.md）の点検校正項目テーブル。
 * 0件時はEmptyStateを表示する。並び順・派生ステータスは呼び出し側(hooks.ts)で確定済みのため、
 * ここは列描画と行アクション(記録/編集)の起動通知だけを担う薄いビュー。
 */

import { StatusBadge } from "@/components/domain";
import { Button, EmptyState, Table, TableBody, TableHead, Td, Th } from "@/components/ui";
import { displayedServiceItemStatus, personLabelOf } from "@/features/equipment/detail/hooks";
import {
  CYCLE_LABELS,
  EXECUTION_LABELS,
  SERVICE_ITEM_TYPE_LABELS,
} from "@/features/serviceItems/constants";
import type {
  EquipmentStatus,
  IsoDateString,
  Person,
  ServiceItem,
  ServiceOrder,
  Vendor,
} from "@/store/types";
import type { ReactElement } from "react";

type Props = {
  serviceItems: readonly ServiceItem[];
  equipmentStatus: EquipmentStatus;
  serviceOrders: Record<string, ServiceOrder>;
  vendors: Record<string, Vendor>;
  persons: Record<string, Person>;
  today: IsoDateString;
  onAddClick: () => void;
  onRecordClick: (serviceItemId: string) => void;
  onEditClick: (serviceItem: ServiceItem) => void;
};

export const ServiceItemTable = ({
  serviceItems,
  equipmentStatus,
  serviceOrders,
  vendors,
  persons,
  today,
  onAddClick,
  onRecordClick,
  onEditClick,
}: Props): ReactElement =>
  serviceItems.length === 0 ? (
    <EmptyState
      message="点検校正項目が未登録です"
      action={<Button onClick={onAddClick}>+ 項目を追加</Button>}
    />
  ) : (
    <Table>
      <TableHead>
        <tr>
          <Th>状態</Th>
          <Th>項目名</Th>
          <Th>種別</Th>
          <Th>内外</Th>
          <Th>周期</Th>
          <Th>担当</Th>
          <Th>次回期限</Th>
          <Th>アクション</Th>
        </tr>
      </TableHead>
      <TableBody>
        {serviceItems.map((serviceItem) => {
          const status = displayedServiceItemStatus(
            serviceItem,
            equipmentStatus,
            serviceOrders,
            vendors,
            today,
          );
          return (
            <tr
              key={serviceItem.id}
              className={serviceItem.isActive ? undefined : "text-slate-400"}
            >
              <Td>{status === null ? "—" : <StatusBadge status={status} />}</Td>
              <Td>{serviceItem.name}</Td>
              <Td>{SERVICE_ITEM_TYPE_LABELS[serviceItem.type]}</Td>
              <Td>{EXECUTION_LABELS[serviceItem.execution]}</Td>
              <Td>{CYCLE_LABELS[serviceItem.cycle]}</Td>
              <Td>{personLabelOf({ persons }, serviceItem.personId)}</Td>
              <Td>{serviceItem.nextDueDate}</Td>
              {/* なぜ td 直下に Button を並べるか: equipment/list や VendorList と同様、
                  div でラップするとjsx-a11yのボタンラベル探索深度を超えるためtdをflex化する */}
              <Td className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onRecordClick(serviceItem.id);
                  }}
                >
                  記録
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onEditClick(serviceItem);
                  }}
                >
                  編集
                </Button>
              </Td>
            </tr>
          );
        })}
      </TableBody>
    </Table>
  );
