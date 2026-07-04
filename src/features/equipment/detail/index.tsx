/**
 * 機器詳細画面（screen-design/04-equipment-detail.md）。
 * 1機器の基本情報・点検校正項目一覧・実施記録(項目横断)を集約表示し、
 * 項目追加/編集モーダルの起動起点となる。表示専用画面であり、入力検証は各モーダル側の責務。
 * 並び替え・派生ステータスの計算ロジックは hooks.ts に集約する（coding-standards.md §2）。
 * モーダル起動は単一 state で kind を持ち、1度に開くのは1つ。閉じたら state をリセットする。
 */

import { InspectionItemModal, RecordModal, StatusBadge } from "@/components/domain";
import { Badge, Button, EmptyState, Table, TableBody, TableHead } from "@/components/ui";
import { ROUTES, equipmentEditPath } from "@/constants/routes";
import {
  EQUIPMENT_STATUS_BADGE_CLASSES,
  EQUIPMENT_STATUS_LABELS,
} from "@/features/equipment/constants";
import {
  displayedInspectionItemStatus,
  historyRowsOf,
  personLabelOf,
  sortedInspectionItemsOf,
  todayIsoDate,
  useSafeNavigate,
} from "@/features/equipment/detail/hooks";
import {
  CYCLE_LABELS,
  EXECUTION_LABELS,
  INSPECTION_ITEM_TYPE_LABELS,
  RECORD_RESULT_LABELS,
} from "@/features/inspectionItems/constants";
import type { InspectionItem } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useState, type ReactElement } from "react";
import { Navigate, useParams } from "react-router-dom";

/** 起動中モーダルの種別(画面ローカルUI状態)。1度に1つのみ開く */
const MODAL_KIND = {
  ADD: "add",
  EDIT: "edit",
  RECORD: "record",
} as const;
type ModalState =
  | { kind: typeof MODAL_KIND.ADD }
  | { kind: typeof MODAL_KIND.EDIT; inspectionItem: InspectionItem }
  | { kind: typeof MODAL_KIND.RECORD; inspectionItemId: string };

export const EquipmentDetail = (): ReactElement => {
  const { id } = useParams<{ id: string }>();
  const safeNavigate = useSafeNavigate();

  const equipmentMap = useAppStore((state) => state.equipment);
  const vendors = useAppStore((state) => state.vendors);
  const persons = useAppStore((state) => state.persons);
  const inspectionItems = useAppStore((state) => state.inspectionItems);
  const orders = useAppStore((state) => state.orders);
  const records = useAppStore((state) => state.records);

  const [modal, setModal] = useState<ModalState | null>(null);

  const currentEquipment = id === undefined ? undefined : equipmentMap[id];

  if (currentEquipment === undefined) {
    return <Navigate to={ROUTES.EQUIPMENT_LIST} replace />;
  }

  const handleAddInspectionItemClick = (): void => {
    setModal({ kind: MODAL_KIND.ADD });
  };
  const handleEditInspectionItemClick = (inspectionItem: InspectionItem): void => {
    setModal({ kind: MODAL_KIND.EDIT, inspectionItem });
  };
  const handleModalClose = (): void => {
    setModal(null);
  };

  const inspectionItemList = sortedInspectionItemsOf(inspectionItems, currentEquipment.id);
  const historyRows = historyRowsOf(inspectionItems, records, currentEquipment.id);
  // today は行ごとに再取得せず1度だけ計算し、displayedInspectionItemStatus へ注入する
  // (inspectionItemRowsOf と同方針、テスト容易性のため)
  const today = todayIsoDate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {currentEquipment.managementNo} {currentEquipment.name}
        </h1>
        <Button
          onClick={() => {
            safeNavigate(equipmentEditPath(currentEquipment.id));
          }}
        >
          編集
        </Button>
      </div>

      <div className="rounded border border-slate-200 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">型式</dt>
            <dd>{currentEquipment.model ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">S/N</dt>
            <dd>{currentEquipment.serialNo ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">メーカー</dt>
            <dd>
              {(currentEquipment.manufacturerId !== undefined &&
                vendors[currentEquipment.manufacturerId]?.name) ||
                "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">設置場所</dt>
            <dd>{currentEquipment.location ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">状態</dt>
            <dd>
              <Badge className={EQUIPMENT_STATUS_BADGE_CLASSES[currentEquipment.status]}>
                {EQUIPMENT_STATUS_LABELS[currentEquipment.status]}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">備考</dt>
            <dd>{currentEquipment.note ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">点検校正項目</h2>
          <Button onClick={handleAddInspectionItemClick}>+ 項目を追加</Button>
        </div>

        {inspectionItemList.length === 0 ? (
          <EmptyState
            message="点検校正項目が未登録です"
            action={<Button onClick={handleAddInspectionItemClick}>+ 項目を追加</Button>}
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
              {inspectionItemList.map((inspectionItem) => {
                const status = displayedInspectionItemStatus(
                  inspectionItem,
                  currentEquipment.status,
                  orders,
                  vendors,
                  today,
                );
                return (
                  <tr
                    key={inspectionItem.id}
                    className={inspectionItem.isActive ? undefined : "text-slate-400"}
                  >
                    <td className="px-3 py-2">
                      {status === null ? "—" : <StatusBadge status={status} />}
                    </td>
                    <td className="px-3 py-2">{inspectionItem.name}</td>
                    <td className="px-3 py-2">
                      {INSPECTION_ITEM_TYPE_LABELS[inspectionItem.type]}
                    </td>
                    <td className="px-3 py-2">{EXECUTION_LABELS[inspectionItem.execution]}</td>
                    <td className="px-3 py-2">{CYCLE_LABELS[inspectionItem.cycle]}</td>
                    <td className="px-3 py-2">
                      {personLabelOf({ persons }, inspectionItem.personId)}
                    </td>
                    <td className="px-3 py-2">{inspectionItem.nextDueDate}</td>
                    {/* なぜ td 直下に Button を並べるか: equipment/list や VendorList と同様、
                        div でラップするとjsx-a11yのボタンラベル探索深度を超えるためtdをflex化する */}
                    <td className="flex gap-2 px-3 py-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setModal({
                            kind: MODAL_KIND.RECORD,
                            inspectionItemId: inspectionItem.id,
                          });
                        }}
                      >
                        記録
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          handleEditInspectionItemClick(inspectionItem);
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
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">実施記録(全項目横断・新しい順)</h2>

        {historyRows.length === 0 ? (
          <EmptyState message="実施記録が未登録です" />
        ) : (
          <Table>
            <TableHead>
              <tr>
                <th scope="col" className="px-3 py-2 text-left">
                  実施日
                </th>
                <th scope="col" className="px-3 py-2 text-left">
                  項目名
                </th>
                <th scope="col" className="px-3 py-2 text-left">
                  実施者
                </th>
                <th scope="col" className="px-3 py-2 text-left">
                  結果
                </th>
                <th scope="col" className="px-3 py-2 text-left">
                  備考
                </th>
              </tr>
            </TableHead>
            <TableBody>
              {historyRows.map(({ record, inspectionItemName }) => (
                <tr key={record.id}>
                  <td className="px-3 py-2">{record.doneDate}</td>
                  <td className="px-3 py-2">{inspectionItemName}</td>
                  <td className="px-3 py-2">{record.doneBy}</td>
                  <td className="px-3 py-2">{RECORD_RESULT_LABELS[record.result]}</td>
                  <td className="px-3 py-2">{record.note ?? "—"}</td>
                </tr>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {modal?.kind === MODAL_KIND.ADD ? (
        <InspectionItemModal open equipmentId={currentEquipment.id} onClose={handleModalClose} />
      ) : null}
      {modal?.kind === MODAL_KIND.EDIT ? (
        <InspectionItemModal
          open
          equipmentId={currentEquipment.id}
          inspectionItem={modal.inspectionItem}
          onClose={handleModalClose}
        />
      ) : null}
      {modal?.kind === MODAL_KIND.RECORD ? (
        <RecordModal
          key={modal.inspectionItemId}
          open
          inspectionItemId={modal.inspectionItemId}
          onClose={handleModalClose}
        />
      ) : null}
    </div>
  );
};
