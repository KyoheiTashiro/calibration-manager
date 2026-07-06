import { AppLayout } from "@/components/system";
import { ROUTES } from "@/constants/routes";
import { Dashboard } from "@/features/dashboard";
import { EquipmentDetail } from "@/features/equipment/detail";
import { EquipmentCreateForm } from "@/features/equipment/form/create";
import { EquipmentEditForm } from "@/features/equipment/form/edit";
import { EquipmentList } from "@/features/equipment/list";
import { Manual } from "@/features/manual";
import { NotificationCenter } from "@/features/notifications";
import { useNotificationScan } from "@/features/notifications/scan/useNotificationScan";
import { PersonList } from "@/features/persons";
import { ServiceItemList } from "@/features/serviceItems/list";
import { ServiceOrderList } from "@/features/serviceOrder";
import { Settings } from "@/features/settings";
import { VendorList } from "@/features/vendors";
import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";

function App(): ReactElement {
  useNotificationScan();

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.EQUIPMENT_LIST} element={<EquipmentList />} />
        {/* 新規/編集は form/create・form/edit に分割している（共通フィールドは form/shared）。 */}
        <Route path={ROUTES.EQUIPMENT_CREATE} element={<EquipmentCreateForm />} />
        <Route path={ROUTES.EQUIPMENT_DETAIL} element={<EquipmentDetail />} />
        <Route path={ROUTES.EQUIPMENT_EDIT} element={<EquipmentEditForm />} />
        <Route path={ROUTES.SERVICE_ITEM_LIST} element={<ServiceItemList />} />
        <Route path={ROUTES.SERVICE_ORDER_LIST} element={<ServiceOrderList />} />
        <Route path={ROUTES.VENDOR_LIST} element={<VendorList />} />
        <Route path={ROUTES.PERSON_LIST} element={<PersonList />} />
        <Route path={ROUTES.NOTIFICATION_LIST} element={<NotificationCenter />} />
        <Route path={ROUTES.SETTINGS} element={<Settings />} />
        <Route path={ROUTES.MANUAL} element={<Manual />} />
        <Route path="*" element={<div>ページが見つかりません</div>} />
      </Route>
    </Routes>
  );
}

export default App;
