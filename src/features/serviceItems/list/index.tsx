import { ServiceItemModal, ServiceOrderModal, ServiceRecordModal } from "@/components/domain";
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

const MODAL_KIND = {
  SERVICE_RECORD: "serviceRecord",
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

  const handleFilterChange = (key: keyof ServiceItemListFilters, value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value === FILTER_ALL) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

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
                setModal({ kind: MODAL_KIND.SERVICE_RECORD, row });
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

      {modal?.kind === MODAL_KIND.SERVICE_RECORD ? (
        <ServiceRecordModal open serviceItemId={modal.row.serviceItem.id} onClose={closeModal} />
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
