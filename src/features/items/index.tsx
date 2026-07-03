/**
 * 点検校正項目一覧画面(screen-design/05-item-list.md、中核画面)。
 * 全機器の有効項目を期限順で俯瞰し、フィルタと行アクション(記録/案件/編集)で運用を回す。
 *
 * - フィルタの真実源はURLクエリ(D-022)。useSearchParams で読み、parseItemListFilters で解釈する。
 *   ローカル state に二重管理しない。変更・クリアは setSearchParams(replace) で反映する。
 * - 行導出・並び・フィルタ適用は hooks.ts の純関数に委譲し、本コンポーネントは薄いビューに保つ。
 * - モーダル起動は単一 state で kind を持ち、1度に開くのは1つ。閉じたら state をリセットする。
 */

import { ItemModal, OrderModal, RecordModal } from "@/components/domain";
import { Button, EmptyState } from "@/components/ui";
import { FilterBar } from "@/features/items/FilterBar";
import {
  buildItemRows,
  FILTER_ALL,
  filterItemRows,
  parseItemListFilters,
  type ItemListFilters,
  type ItemRow,
} from "@/features/items/hooks";
import { ItemTable } from "@/features/items/ItemTable";
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
type ModalState = { kind: ModalKind; row: ItemRow };

export const ItemList = (): ReactElement => {
  const [searchParams, setSearchParams] = useSearchParams();
  const items = useAppStore((state) => state.items);
  const equipment = useAppStore((state) => state.equipment);
  const orders = useAppStore((state) => state.orders);
  const vendors = useAppStore((state) => state.vendors);
  const persons = useAppStore((state) => state.persons);

  const [modal, setModal] = useState<ModalState | null>(null);

  const filters = parseItemListFilters(searchParams, persons);

  const rows = useMemo(
    () => buildItemRows({ items, equipment, orders, vendors, persons }, todayIsoDate()),
    [items, equipment, orders, vendors, persons],
  );
  const filteredRows = filterItemRows(rows, filters);

  // 変更: 値が「全て」なら該当パラメータを除去、それ以外は set。未知パラメータは維持(D-022)
  const handleFilterChange = (key: keyof ItemListFilters, value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value === FILTER_ALL) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  // クリア: 4フィルタのパラメータのみ除去し、他の未知パラメータは維持する
  const handleClear = (): void => {
    const next = new URLSearchParams(searchParams);
    for (const key of Object.keys(filters)) {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const closeModal = (): void => setModal(null);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">点検校正項目一覧</h1>

      {rows.length === 0 ? (
        <EmptyState message="表示できる項目がありません" />
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
              message="条件に一致する項目がありません"
              action={<Button onClick={handleClear}>クリア</Button>}
            />
          ) : (
            <ItemTable
              rows={filteredRows}
              onRecord={(row) => setModal({ kind: MODAL_KIND.RECORD, row })}
              onOrder={(row) => setModal({ kind: MODAL_KIND.ORDER, row })}
              onEdit={(row) => setModal({ kind: MODAL_KIND.EDIT, row })}
            />
          )}
        </>
      )}

      {modal?.kind === MODAL_KIND.RECORD ? (
        <RecordModal open itemId={modal.row.item.id} onClose={closeModal} />
      ) : null}
      {modal?.kind === MODAL_KIND.ORDER ? (
        <OrderModal open itemId={modal.row.item.id} onClose={closeModal} />
      ) : null}
      {modal?.kind === MODAL_KIND.EDIT ? (
        <ItemModal
          open
          equipmentId={modal.row.item.equipmentId}
          item={modal.row.item}
          onClose={closeModal}
        />
      ) : null}
    </div>
  );
};
