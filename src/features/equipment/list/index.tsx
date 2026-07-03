/**
 * 機器一覧画面（screen-design/02-equipment-list.md）。
 * 検索・状態フィルタ・行クリック遷移のみを扱う（廃棄・削除・編集はこの画面の責務外）。
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
import { inspectionItemsOf } from "@/store/selectors";
import { EQUIPMENT_STATUS, type Equipment, type EquipmentStatus } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useMemo, useState, type KeyboardEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";

/**
 * 状態フィルタの選択肢（as const + 派生union、coding-standards.md §1）。
 * ドメインの EquipmentStatus とは別軸（「稼働+休止」「全て」という複合値を持つ）のため
 * features/equipment/constants.ts には追加せずこのファイルに閉じたモジュールレベル定数とする。
 */
const STATUS_FILTER = {
  ACTIVE_AND_SUSPENDED: "activeAndSuspended",
  ALL: "all",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  RETIRED: "retired",
} as const;
type StatusFilter = (typeof STATUS_FILTER)[keyof typeof STATUS_FILTER];

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: STATUS_FILTER.ACTIVE_AND_SUSPENDED, label: "稼働+休止" },
  { value: STATUS_FILTER.ALL, label: "全て" },
  { value: STATUS_FILTER.ACTIVE, label: "稼働" },
  { value: STATUS_FILTER.SUSPENDED, label: "休止" },
  { value: STATUS_FILTER.RETIRED, label: "廃棄" },
];

/** 状態フィルタの選択値が機器の状態に一致するか（screen-design/02-equipment-list.md「操作・アクション」） */
const matchesStatusFilter = (status: EquipmentStatus, filter: StatusFilter): boolean => {
  switch (filter) {
    case STATUS_FILTER.ALL: {
      return true;
    }
    case STATUS_FILTER.ACTIVE: {
      return status === EQUIPMENT_STATUS.ACTIVE;
    }
    case STATUS_FILTER.SUSPENDED: {
      return status === EQUIPMENT_STATUS.SUSPENDED;
    }
    case STATUS_FILTER.RETIRED: {
      return status === EQUIPMENT_STATUS.RETIRED;
    }
    case STATUS_FILTER.ACTIVE_AND_SUSPENDED: {
      return status !== EQUIPMENT_STATUS.RETIRED;
    }
    default: {
      return true;
    }
  }
};

/** 検索語がmanagementNo/name/modelのいずれかに部分一致するか(大文字小文字無視) */
const matchesSearch = (equipment: Equipment, normalizedSearch: string): boolean => {
  if (normalizedSearch === "") return true;
  const haystack = [equipment.managementNo, equipment.name, equipment.model ?? ""]
    .join("\n")
    .toLowerCase();
  return haystack.includes(normalizedSearch);
};

export const EquipmentList = (): ReactElement => {
  const navigate = useNavigate();
  const equipment = useAppStore((state) => state.equipment);
  const vendors = useAppStore((state) => state.vendors);
  const inspectionItems = useAppStore((state) => state.inspectionItems);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    STATUS_FILTER.ACTIVE_AND_SUSPENDED,
  );

  const totalCount = Object.keys(equipment).length;

  const filteredEquipmentList = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return Object.values(equipment)
      .filter((entry) => matchesStatusFilter(entry.status, statusFilter))
      .filter((entry) => matchesSearch(entry, normalizedSearch))
      .toSorted((left, right) => left.managementNo.localeCompare(right.managementNo));
  }, [equipment, searchText, statusFilter]);

  /** 機器の最も近い次回期限（非稼働は無条件で— / 有効項目なしも—。screen-design §2「最も近い次回期限」） */
  const nearestDueDateOf = (target: Equipment): string => {
    if (target.status !== EQUIPMENT_STATUS.ACTIVE) return "—";
    const dueDates = inspectionItemsOf({ inspectionItems }, target.id)
      .filter((inspectionItem) => inspectionItem.isActive)
      .map((inspectionItem) => inspectionItem.nextDueDate);
    if (dueDates.length === 0) return "—";
    return dueDates.toSorted((left, right) => left.localeCompare(right))[0] ?? "—";
  };

  const handleAddClick = (): void => {
    navigate(ROUTES.EQUIPMENT_NEW);
  };

  const handleRowActivate = (equipmentId: string): void => {
    navigate(equipmentDetailPath(equipmentId));
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
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                label="状態"
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
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
                    onClick={() => handleRowActivate(entry.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, entry.id)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-3 py-2">{entry.managementNo}</td>
                    <td className="px-3 py-2">{entry.name}</td>
                    <td className="px-3 py-2">{entry.model || "—"}</td>
                    <td className="px-3 py-2">
                      {(entry.manufacturerId !== undefined &&
                        vendors[entry.manufacturerId]?.name) ||
                        "—"}
                    </td>
                    <td className="px-3 py-2">{entry.location || "—"}</td>
                    <td className="px-3 py-2">
                      {/* oxlint-disable-next-line react/forbid-component-props -- Badgeはclassnameで色を渡す設計（Badge.tsx参照） */}
                      <Badge className={EQUIPMENT_STATUS_BADGE_CLASSES[entry.status]}>
                        {EQUIPMENT_STATUS_LABELS[entry.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {inspectionItemsOf({ inspectionItems }, entry.id).length}
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
