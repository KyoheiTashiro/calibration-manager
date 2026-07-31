import { PersonModal } from '@/components/domain/PersonModal';
import {
  Badge,
  Button,
  EmptyState,
  Pagination,
  Select,
  Table,
  TableBody,
  TableHead,
  Td,
  TextField,
  Th,
  usePagination,
} from '@/components/ui';
import { UNSET_LABEL } from '@/constants/labels';
import { STATUS_FILTER_OPTIONS, isStatusFilter, usePersonList } from '@/features/persons/hooks';
import type { Person } from '@/store/types';
import { useEntityModal } from '@/utils/modal';
import type { ReactElement } from 'react';

/** 状態バッジの色classNameマッピング（StatusBadgeと同じ配色パターン） */
const ACTIVE_BADGE_CLASS_NAME = 'bg-green-100 text-green-800';
const INACTIVE_BADGE_CLASS_NAME = 'bg-slate-100 text-slate-600';

/** 物理削除は行わず、モーダル内の「有効」チェックボックストグルで無効化する。 */
export const PersonList = (): ReactElement => {
  const {
    totalCount,
    filteredPersonList,
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
  } = usePersonList();
  const {
    page,
    pageSize,
    totalCount: pagedTotalCount,
    pagedItems,
    setPage,
    setPageSize,
  } = usePagination(filteredPersonList, `${searchText}|${statusFilter}`);
  const { modalState, handleAddClick, handleEditClick, handleModalClose } =
    useEntityModal<Person>();

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-xl font-bold'>担当者一覧</h1>
      {totalCount === 0 ? (
        <EmptyState
          message='担当者が未登録です'
          action={<Button onClick={handleAddClick}>+ 追加</Button>}
        />
      ) : (
        <>
          <div className='flex flex-wrap items-end gap-4'>
            <div className='w-1/2 min-w-64'>
              <TextField
                label='検索'
                placeholder='氏名, 部署, メールで検索'
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                }}
              />
            </div>
            <div className='w-40'>
              <Select
                label='状態'
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(value) => {
                  if (isStatusFilter(value)) setStatusFilter(value);
                }}
              />
            </div>
            <div className='ml-auto'>
              <Button onClick={handleAddClick}>+ 追加</Button>
            </div>
          </div>

          {filteredPersonList.length === 0 ? (
            <EmptyState message='条件に一致する担当者はありません' />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>氏名</Th>
                  <Th>部署</Th>
                  <Th>メール</Th>
                  <Th>状態</Th>
                  <Th>操作</Th>
                </tr>
              </TableHead>
              <TableBody>
                {pagedItems.map((person) => (
                  <tr key={person.id}>
                    <Td>{person.name}</Td>
                    <Td>{person.department ?? UNSET_LABEL}</Td>
                    <Td>{person.email}</Td>
                    <Td>
                      <Badge
                        className={
                          person.isActive ? ACTIVE_BADGE_CLASS_NAME : INACTIVE_BADGE_CLASS_NAME
                        }
                      >
                        {person.isActive ? '有効' : '無効'}
                      </Badge>
                    </Td>
                    {/* なぜ truncate 無効か: Td の truncate は子を div でラップするが、
                        jsx-a11y(control-has-associated-label)の探索深度を超えて
                        ボタン内テキストを検出できなくなるため td 直下に置く。 */}
                    <Td truncate={false}>
                      <Button
                        size='sm'
                        variant='secondary'
                        onClick={() => {
                          handleEditClick(person);
                        }}
                      >
                        編集
                      </Button>
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredPersonList.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={pagedTotalCount}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </>
      )}

      <PersonModal open={modalState.open} person={modalState.entity} onClose={handleModalClose} />
    </div>
  );
};
