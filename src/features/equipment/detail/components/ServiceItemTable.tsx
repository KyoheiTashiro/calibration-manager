import { StatusBadge } from '@/components/domain';
import {
  Button,
  EmptyState,
  Pagination,
  Table,
  TableBody,
  TableHead,
  Td,
  Th,
  usePagination,
} from '@/components/ui';
import { UNSET_LABEL } from '@/constants/labels';
import { displayedServiceItemStatus } from '@/features/equipment/detail/hooks';
import {
  CYCLE_LABELS,
  EXECUTION_LABELS,
  SERVICE_ITEM_TYPE_LABELS,
} from '@/features/serviceItems/constants';
import { personLabelOf } from '@/store/selectors';
import type {
  EquipmentStatus,
  IsoDateString,
  Person,
  ServiceItem,
  ServiceOrder,
  Vendor,
} from '@/store/types';
import type { ReactElement } from 'react';

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

/**
 * 点検校正項目テーブル。ページネーションをテーブル単位で持つ(screen-design/README.md
 * §0.8 D-076、04-equipment-detail.md D-078: 実施記録テーブルとページ状態を独立させる)。
 * usePagination は hook のため EquipmentDetail 側の早期return後には呼べず、
 * このコンポーネント内で呼ぶ。
 */
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
}: Props): ReactElement => {
  const pagination = usePagination(serviceItems);

  if (serviceItems.length === 0) {
    return (
      <EmptyState
        message='点検校正項目が未登録です'
        action={<Button onClick={onAddClick}>+ 項目を追加</Button>}
      />
    );
  }

  return (
    <>
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
          {pagination.pagedItems.map((serviceItem) => {
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
                className={serviceItem.isActive ? undefined : 'text-slate-400'}
              >
                <Td>{status === null ? UNSET_LABEL : <StatusBadge status={status} />}</Td>
                <Td>{serviceItem.name}</Td>
                <Td>{SERVICE_ITEM_TYPE_LABELS[serviceItem.type]}</Td>
                <Td>{EXECUTION_LABELS[serviceItem.execution]}</Td>
                <Td>{CYCLE_LABELS[serviceItem.cycle]}</Td>
                <Td>{personLabelOf({ persons }, serviceItem.personId)}</Td>
                <Td>{serviceItem.nextDueDate}</Td>
                {/* なぜ td 直下に Button を並べるか: equipment/list や VendorList と同様、
                  div でラップするとjsx-a11yのボタンラベル探索深度を超えるためtdをflex化する */}
                <Td className='flex gap-2' truncate={false}>
                  <Button
                    variant='secondary'
                    size='sm'
                    onClick={() => {
                      onRecordClick(serviceItem.id);
                    }}
                  >
                    記録
                  </Button>
                  <Button
                    variant='secondary'
                    size='sm'
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
      <Pagination {...pagination} />
    </>
  );
};
