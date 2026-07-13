import { ServiceItemModal, ServiceRecordModal } from "@/components/domain";
import { Button } from "@/components/ui";
import { ROUTES, equipmentEditPath } from "@/constants/routes";
import { EquipmentInfoCard } from "@/features/equipment/detail/components/EquipmentInfoCard";
import { ServiceItemTable } from "@/features/equipment/detail/components/ServiceItemTable";
import { ServiceRecordTable } from "@/features/equipment/detail/components/ServiceRecordTable";
import {
  historyRowsOf,
  sortedServiceItemsOf,
  todayIsoDate,
  useSafeNavigate,
  type ServiceItem,
} from "@/features/equipment/detail/hooks";
import { useAppStore } from "@/store/useAppStore";
import { useState, type ReactElement } from "react";
import { Navigate, useParams } from "react-router-dom";

const MODAL_KIND = {
  ADD: "add",
  EDIT: "edit",
  SERVICE_RECORD: "serviceRecord",
} as const;
type ModalState =
  | { kind: typeof MODAL_KIND.ADD }
  | { kind: typeof MODAL_KIND.EDIT; serviceItem: ServiceItem }
  | { kind: typeof MODAL_KIND.SERVICE_RECORD; serviceItemId: string };

export const EquipmentDetail = (): ReactElement => {
  const { id } = useParams<{ id: string }>();
  const safeNavigate = useSafeNavigate();

  const equipmentMap = useAppStore((state) => state.equipment);
  const vendors = useAppStore((state) => state.vendors);
  const persons = useAppStore((state) => state.persons);
  const serviceItems = useAppStore((state) => state.serviceItems);
  const serviceOrders = useAppStore((state) => state.serviceOrders);
  const serviceRecords = useAppStore((state) => state.serviceRecords);

  const [modal, setModal] = useState<ModalState | null>(null);

  const currentEquipment = id === undefined ? undefined : equipmentMap[id];

  if (currentEquipment === undefined) {
    return <Navigate to={ROUTES.EQUIPMENT_LIST} replace />;
  }

  const handleAddServiceItemClick = (): void => {
    setModal({ kind: MODAL_KIND.ADD });
  };
  const handleEditServiceItemClick = (serviceItem: ServiceItem): void => {
    setModal({ kind: MODAL_KIND.EDIT, serviceItem });
  };
  const handleModalClose = (): void => {
    setModal(null);
  };

  const serviceItemList = sortedServiceItemsOf(serviceItems, currentEquipment.id);
  const serviceRecordRows = historyRowsOf(serviceItems, serviceRecords, currentEquipment.id);
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

      <EquipmentInfoCard equipment={currentEquipment} vendors={vendors} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">点検校正項目</h2>
          <Button onClick={handleAddServiceItemClick}>+ 項目を追加</Button>
        </div>

        <ServiceItemTable
          serviceItems={serviceItemList}
          equipmentStatus={currentEquipment.status}
          serviceOrders={serviceOrders}
          vendors={vendors}
          persons={persons}
          today={today}
          onAddClick={handleAddServiceItemClick}
          onRecordClick={(serviceItemId) => {
            setModal({ kind: MODAL_KIND.SERVICE_RECORD, serviceItemId });
          }}
          onEditClick={handleEditServiceItemClick}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">実施記録</h2>

        <ServiceRecordTable serviceRecordRows={serviceRecordRows} />
      </div>

      {modal?.kind === MODAL_KIND.ADD ? (
        <ServiceItemModal open equipmentId={currentEquipment.id} onClose={handleModalClose} />
      ) : null}
      {modal?.kind === MODAL_KIND.EDIT ? (
        <ServiceItemModal
          open
          equipmentId={currentEquipment.id}
          serviceItem={modal.serviceItem}
          onClose={handleModalClose}
        />
      ) : null}
      {modal?.kind === MODAL_KIND.SERVICE_RECORD ? (
        <ServiceRecordModal
          key={modal.serviceItemId}
          open
          serviceItemId={modal.serviceItemId}
          onClose={handleModalClose}
        />
      ) : null}
    </div>
  );
};
