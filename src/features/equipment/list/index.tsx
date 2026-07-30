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
  activatableRowProps,
  usePagination,
} from "@/components/ui";
import { UNSET_LABEL } from "@/constants/labels";
import { ROUTES, equipmentDetailPath } from "@/constants/routes";
import {
  EQUIPMENT_STATUS_BADGE_CLASSES,
  EQUIPMENT_STATUS_LABELS,
} from "@/features/equipment/constants";
import {
  STATUS_FILTER_OPTIONS,
  isStatusFilter,
  useEquipmentList,
} from "@/features/equipment/list/hooks";
import { useSafeNavigate } from "@/utils/navigation";
import type { ReactElement } from "react";

export const EquipmentList = (): ReactElement => {
  const safeNavigate = useSafeNavigate();
  const {
    totalCount,
    filteredEquipmentList,
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
    manufacturerNameOf,
    serviceItemCountOf,
    nearestDueDateOf,
  } = useEquipmentList();
  const {
    page,
    pageSize,
    totalCount: pagedTotalCount,
    pagedItems,
    setPage,
    setPageSize,
  } = usePagination(filteredEquipmentList, `${searchText}|${statusFilter}`);

  const handleAddClick = (): void => {
    safeNavigate(ROUTES.EQUIPMENT_CREATE);
  };

  const handleRowActivate = (equipmentId: string): void => {
    safeNavigate(equipmentDetailPath(equipmentId));
  };

  return (
    <div className="flex flex-col gap-4">
      {totalCount === 0 ? (
        <EmptyState
          message="機器が未登録です"
          action={<Button onClick={handleAddClick}>+ 機器を追加</Button>}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-1/2 min-w-64">
              <TextField
                label="検索"
                placeholder="管理番号, 機器名, 型式で検索"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                }}
              />
            </div>
            <div className="w-40">
              <Select
                label="状態"
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(value) => {
                  if (isStatusFilter(value)) setStatusFilter(value);
                }}
              />
            </div>
            <div className="ml-auto">
              <Button onClick={handleAddClick}>+ 機器を追加</Button>
            </div>
          </div>

          {filteredEquipmentList.length === 0 ? (
            <EmptyState message="条件に一致する機器はありません" />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>管理番号</Th>
                  <Th>機器名</Th>
                  <Th>型式</Th>
                  <Th>メーカー</Th>
                  <Th>設置場所</Th>
                  <Th>状態</Th>
                  <Th align="right">点検校正項目数</Th>
                  <Th>次回期限</Th>
                </tr>
              </TableHead>
              <TableBody>
                {pagedItems.map((entry) => (
                  <tr
                    key={entry.id}
                    {...activatableRowProps(() => {
                      handleRowActivate(entry.id);
                    })}
                  >
                    <Td>{entry.managementNo}</Td>
                    <Td>{entry.name}</Td>
                    <Td>{entry.model ?? UNSET_LABEL}</Td>
                    <Td>{manufacturerNameOf(entry) ?? UNSET_LABEL}</Td>
                    <Td>{entry.location ?? UNSET_LABEL}</Td>
                    <Td>
                      <Badge className={EQUIPMENT_STATUS_BADGE_CLASSES[entry.status]}>
                        {EQUIPMENT_STATUS_LABELS[entry.status]}
                      </Badge>
                    </Td>
                    <Td className="text-right tabular-nums">{serviceItemCountOf(entry)}</Td>
                    <Td>{nearestDueDateOf(entry)}</Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredEquipmentList.length > 0 && (
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
    </div>
  );
};
