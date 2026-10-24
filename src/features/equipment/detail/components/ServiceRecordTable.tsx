import {
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
import type { ServiceRecordRow } from '@/features/equipment/detail/hooks';
import { SERVICE_RECORD_RESULT_LABELS } from '@/features/serviceItems/constants';
import type { ReactElement } from 'react';

type Props = {
  serviceRecordRows: readonly ServiceRecordRow[];
};

/**
 * 実施記録テーブル。ページネーションをテーブル単位で持つ(screen-design/README.md
 * §0.8 D-076、04-equipment-detail.md D-078: 点検校正項目テーブルとページ状態を独立させる)。
 */
export const ServiceRecordTable = ({ serviceRecordRows }: Props): ReactElement => {
  const pagination = usePagination(serviceRecordRows);

  if (serviceRecordRows.length === 0) {
    return <EmptyState message='実施記録が未登録です' />;
  }

  return (
    <>
      <Table>
        <TableHead>
          <tr>
            <Th>実施日</Th>
            <Th>項目名</Th>
            <Th>実施者</Th>
            <Th>結果</Th>
            <Th>備考</Th>
          </tr>
        </TableHead>
        <TableBody>
          {pagination.pagedItems.map(({ serviceRecord, serviceItemName }) => (
            <tr key={serviceRecord.id}>
              <Td>{serviceRecord.doneDate}</Td>
              <Td>{serviceItemName}</Td>
              <Td>{serviceRecord.doneBy}</Td>
              <Td>{SERVICE_RECORD_RESULT_LABELS[serviceRecord.result]}</Td>
              <Td>{serviceRecord.note ?? UNSET_LABEL}</Td>
            </tr>
          ))}
        </TableBody>
      </Table>
      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalCount={pagination.totalCount}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </>
  );
};
