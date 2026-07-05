/**
 * 機器詳細画面（screen-design/04-equipment-detail.md）の点検校正項目テーブル。
 * 0件時はEmptyStateを表示する。並び順・派生ステータスは呼び出し側(hooks.ts)で確定済みのため、
 * ここは列描画と行アクション(記録/編集)の起動通知だけを担う薄いビュー。
 */

import { StatusBadge } from "@/components/domain";
import { Button, EmptyState, Table, TableBody, TableHead } from "@/components/ui";
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
          <th scope="col" className="px-3 py-2 text-left">
            状態
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
            次回期限
          </th>
          <th scope="col" className="px-3 py-2 text-left">
            アクション
          </th>
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
              <td className="px-3 py-2">
                {status === null ? "—" : <StatusBadge status={status} />}
              </td>
              <td className="px-3 py-2">{serviceItem.name}</td>
              <td className="px-3 py-2">{SERVICE_ITEM_TYPE_LABELS[serviceItem.type]}</td>
              <td className="px-3 py-2">{EXECUTION_LABELS[serviceItem.execution]}</td>
              <td className="px-3 py-2">{CYCLE_LABELS[serviceItem.cycle]}</td>
              <td className="px-3 py-2">{personLabelOf({ persons }, serviceItem.personId)}</td>
              <td className="px-3 py-2">{serviceItem.nextDueDate}</td>
              {/* なぜ td 直下に Button を並べるか: equipment/list や VendorList と同様、
                  div でラップするとjsx-a11yのボタンラベル探索深度を超えるためtdをflex化する */}
              <td className="flex gap-2 px-3 py-2">
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
              </td>
            </tr>
          );
        })}
      </TableBody>
    </Table>
  );
