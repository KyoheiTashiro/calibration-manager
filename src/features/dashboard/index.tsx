import { ActionRequiredList } from "@/features/dashboard/components/ActionRequiredList";
import { NotificationList } from "@/features/dashboard/components/NotificationList";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import { actionRequiredRows, countByStatus, latestNotifications } from "@/features/dashboard/hooks";
import { serviceItemRowsOf } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import { useSafeNavigate } from "@/utils/navigation";
import { todayIsoDate } from "@/utils/time";
import { useMemo, type ReactElement } from "react";

export const Dashboard = (): ReactElement => {
  const safeNavigate = useSafeNavigate();
  const serviceItems = useAppStore((state) => state.serviceItems);
  const equipment = useAppStore((state) => state.equipment);
  const serviceOrders = useAppStore((state) => state.serviceOrders);
  const vendors = useAppStore((state) => state.vendors);
  const persons = useAppStore((state) => state.persons);
  const notifications = useAppStore((state) => state.notifications);

  const rows = useMemo(
    () =>
      serviceItemRowsOf(
        { serviceItems, equipment, serviceOrders, vendors, persons },
        todayIsoDate(),
      ),
    [serviceItems, equipment, serviceOrders, vendors, persons],
  );
  const counts = useMemo(() => countByStatus(rows), [rows]);
  const actionRows = useMemo(() => actionRequiredRows(rows), [rows]);
  const latest = useMemo(() => latestNotifications(notifications), [notifications]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">ダッシュボード</h1>

      <SummaryCards counts={counts} onNavigate={safeNavigate} />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">要対応項目</h2>
        <ActionRequiredList rows={actionRows} onNavigate={safeNavigate} />
      </section>

      <NotificationList notifications={latest} />
    </div>
  );
};
