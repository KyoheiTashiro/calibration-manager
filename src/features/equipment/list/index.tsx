/**
 * 機器一覧画面（screen-design/02-equipment-list.md）。
 * 検索・状態フィルタ・行クリック遷移のみを扱う（廃棄・削除・編集はこの画面の責務外）。
 * フィルタ・導出ロジックは hooks.ts（useEquipmentList）に切り出し、このファイルは薄いビューに保つ。
 */

import {
  Badge,
  Button,
  EmptyState,
  Select,
  Table,
  TableBody,
  TableHead,
  TextField,
} from "@/components/ui";
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
import type { KeyboardEvent, ReactElement } from "react";

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

  const handleAddClick = (): void => {
    safeNavigate(ROUTES.EQUIPMENT_CREATE);
  };

  const handleRowActivate = (equipmentId: string): void => {
    safeNavigate(equipmentDetailPath(equipmentId));
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    equipmentId: string,
  ): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleRowActivate(equipmentId);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">機器一覧</h1>
        <Button onClick={handleAddClick}>+ 機器を追加</Button>
      </div>

      {totalCount === 0 ? (
        <EmptyState
          message="機器が未登録です"
          action={<Button onClick={handleAddClick}>+ 機器を追加</Button>}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-64 flex-1">
              <TextField
                label="検索"
                placeholder="管理番号/名称/型式で検索"
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
                onChange={(event) => {
                  if (isStatusFilter(event.target.value)) {
                    setStatusFilter(event.target.value);
                  }
                }}
              />
            </div>
          </div>

          {filteredEquipmentList.length === 0 ? (
            <EmptyState message="条件に一致する機器はありません" />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <th scope="col" className="px-3 py-2 text-left">
                    管理番号
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    機器名
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    型式
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    メーカー
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    設置場所
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    状態
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    項目数
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    次回期限
                  </th>
                </tr>
              </TableHead>
              <TableBody>
                {filteredEquipmentList.map((entry) => (
                  <tr
                    key={entry.id}
                    tabIndex={0}
                    onClick={() => {
                      handleRowActivate(entry.id);
                    }}
                    onKeyDown={(event) => {
                      handleRowKeyDown(event, entry.id);
                    }}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-3 py-2">{entry.managementNo}</td>
                    <td className="px-3 py-2">{entry.name}</td>
                    <td className="px-3 py-2">{entry.model ?? "—"}</td>
                    <td className="px-3 py-2">{manufacturerNameOf(entry) ?? "—"}</td>
                    <td className="px-3 py-2">{entry.location ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge className={EQUIPMENT_STATUS_BADGE_CLASSES[entry.status]}>
                        {EQUIPMENT_STATUS_LABELS[entry.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {serviceItemCountOf(entry)}
                    </td>
                    <td className="px-3 py-2">{nearestDueDateOf(entry)}</td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
};
