import { Pagination, usePagination } from '@/components/ui';
import { ServiceItemTable } from '@/features/equipment/detail/components/ServiceItemTable';
import type { ServiceItem } from '@/features/equipment/detail/hooks';
import type { EquipmentStatus, IsoDateString, Person, ServiceOrder, Vendor } from '@/store/types';
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
 * 点検校正項目テーブルにページネーションを適用するラッパー(screen-design/README.md
 * §0.8 D-076、04-equipment-detail.md D-078: 実施記録テーブルとページ状態を独立させる)。
 * usePagination は hook のため EquipmentDetail 側の早期return後には呼べない。
 * そのためこの専用コンポーネントへ切り出し、hooksルール違反を避けている。
 */
export const ServiceItemSection = ({
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
  const { page, pageSize, totalCount, pagedItems, setPage, setPageSize } =
    usePagination(serviceItems);

  return (
    <>
      <ServiceItemTable
        serviceItems={pagedItems}
        equipmentStatus={equipmentStatus}
        serviceOrders={serviceOrders}
        vendors={vendors}
        persons={persons}
        today={today}
        onAddClick={onAddClick}
        onRecordClick={onRecordClick}
        onEditClick={onEditClick}
      />
      {totalCount > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </>
  );
};
