/**
 * 点検校正項目一覧画面(screen-design/05-service-item-list.md、中核画面)。
 * 全機器の有効項目を期限順で俯瞰し、フィルタと行アクション(記録/案件/編集)で運用を回す。
 *
 * - フィルタの真実源はURLクエリ(D-022)。useSearchParams で読み、parseServiceItemListFilters で解釈する。
 *   ローカル state に二重管理しない。変更・クリアは setSearchParams(replace) で反映する。
 * - 行導出・並び・フィルタ適用は hooks.ts の純関数に委譲し、本コンポーネントは薄いビューに保つ。
 * - モーダル起動は単一 state で kind を持ち、1度に開くのは1つ。閉じたら state をリセットする。
 */

import { ServiceItemModal, ServiceOrderModal, RecordModal } from "@/components/domain";
import { Button, EmptyState } from "@/components/ui";
import { FilterBar } from "@/features/serviceItems/list/components/FilterBar";
import { ServiceItemTable } from "@/features/serviceItems/list/components/ServiceItemTable";
import {
  FILTER_ALL,
  filterServiceItemRows,
  parseServiceItemListFilters,
  type ServiceItemListFilters,
} from "@/features/serviceItems/list/hooks";
import { serviceItemRowsOf, type ServiceItemRow } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import { todayIsoDate } from "@/utils/time";
import { useMemo, useState, type ReactElement } from "react";
import { useSearchParams } from "react-router-dom";

/** 起動中モーダルの種別(画面ローカルUI状態)。1度に1つのみ開く */
const MODAL_KIND = {
  RECORD: "record",
  ORDER: "order",
  EDIT: "edit",
} as const;
type ModalKind = (typeof MODAL_KIND)[keyof typeof MODAL_KIND];
type ModalState = { kind: ModalKind; row: ServiceItemRow };

export const ServiceItemList = (): ReactElement => {
  const [searchParams, setSearchParams] = useSearchParams();
  const serviceItems = useAppStore((state) => state.serviceItems);
  const equipment = useAppStore((state) => state.equipment);
  const serviceOrders = useAppStore((state) => state.serviceOrders);
  const vendors = useAppStore((state) => state.vendors);
  const persons = useAppStore((state) => state.persons);

  const [modal, setModal] = useState<ModalState | null>(null);

  const filters = parseServiceItemListFilters(searchParams, persons);

  const rows = useMemo(
    () =>
      serviceItemRowsOf(
        { serviceItems, equipment, serviceOrders, vendors, persons },
        todayIsoDate(),
      ),
    [serviceItems, equipment, serviceOrders, vendors, persons],
  );
  const filteredRows = filterServiceItemRows(rows, filters);

  // 変更: 値が「全て」なら該当パラメータを除去、それ以外は set。未知パラメータは維持(D-022)
  const handleFilterChange = (key: keyof ServiceItemListFilters, value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value === FILTER_ALL) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  // クリア: URLクエリを全除去する(D-022「『クリア』は全クエリ除去」)。
  // フィルタ4キーだけでなく未知パラメータも含めて空にする。履歴は汚さない(replace)。
  const handleClear = (): void => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const closeModal = (): void => {
    setModal(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">点検校正項目一覧</h1>

      {rows.length === 0 ? (
        <EmptyState message="点検校正項目が未登録です" />
      ) : (
        <>
          <FilterBar
            filters={filters}
            persons={persons}
            onFilterChange={handleFilterChange}
            onClear={handleClear}
          />
          {filteredRows.length === 0 ? (
            <EmptyState
              message="条件に一致する項目はありません"
              action={<Button onClick={handleClear}>クリア</Button>}
            />
          ) : (
            <ServiceItemTable
              rows={filteredRows}
              onRecord={(row) => {
                setModal({ kind: MODAL_KIND.RECORD, row });
              }}
              onOrder={(row) => {
                setModal({ kind: MODAL_KIND.ORDER, row });
              }}
              onEdit={(row) => {
                setModal({ kind: MODAL_KIND.EDIT, row });
              }}
            />
          )}
        </>
      )}

      {modal?.kind === MODAL_KIND.RECORD ? (
        <RecordModal open serviceItemId={modal.row.serviceItem.id} onClose={closeModal} />
      ) : null}
      {modal?.kind === MODAL_KIND.ORDER ? (
        <ServiceOrderModal open serviceItemId={modal.row.serviceItem.id} onClose={closeModal} />
      ) : null}
      {modal?.kind === MODAL_KIND.EDIT ? (
        <ServiceItemModal
          open
          equipmentId={modal.row.serviceItem.equipmentId}
          serviceItem={modal.row.serviceItem}
          onClose={closeModal}
        />
      ) : null}
    </div>
  );
};
