import { PersonModal } from "@/components/domain/PersonModal";
import {
  Badge,
  Button,
  EmptyState,
  Pagination,
  Table,
  TableBody,
  TableHead,
  Td,
  TextField,
  Th,
  usePagination,
} from "@/components/ui";
import { usePersonList } from "@/features/persons/hooks";
import type { Person } from "@/store/types";
import { useEntityModal } from "@/utils/modal";
import type { ReactElement } from "react";

/** 状態バッジの色classNameマッピング（StatusBadgeと同じ配色パターン） */
const ACTIVE_BADGE_CLASS_NAME = "bg-green-100 text-green-800";
const INACTIVE_BADGE_CLASS_NAME = "bg-slate-100 text-slate-600";

/** 物理削除は行わず、モーダル内の「有効」チェックボックストグルで無効化する。 */
export const PersonList = (): ReactElement => {
  const { totalCount, filteredPersonList, searchText, setSearchText } = usePersonList();
  const {
    page,
    pageSize,
    totalCount: pagedTotalCount,
    pagedItems,
    setPage,
    setPageSize,
  } = usePagination(filteredPersonList, searchText);
  const { modalState, handleAddClick, handleEditClick, handleModalClose } =
    useEntityModal<Person>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">担当者</h1>
        <Button onClick={handleAddClick}>+ 追加</Button>
      </div>

      {totalCount === 0 ? (
        <EmptyState
          message="担当者が未登録です"
          action={<Button onClick={handleAddClick}>+ 追加</Button>}
        />
      ) : (
        <>
          <div className="w-1/2 min-w-64">
            <TextField
              label="検索"
              placeholder="氏名/部署/メールで検索"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
              }}
            />
          </div>

          {filteredPersonList.length === 0 ? (
            <EmptyState message="条件に一致する担当者はありません" />
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
                    <Td>{person.department ?? "—"}</Td>
                    <Td>{person.email}</Td>
                    <Td>
                      <Badge
                        className={
                          person.isActive ? ACTIVE_BADGE_CLASS_NAME : INACTIVE_BADGE_CLASS_NAME
                        }
                      >
                        {person.isActive ? "有効" : "無効"}
                      </Badge>
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="secondary"
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
