/**
 * ダッシュボード画面(screen-design/01-dashboard.md)。表示専用画面。
 * 要対応の全体像(サマリーカード4枚)・要対応項目リスト・最新の通知5件を一望させる。
 *
 * - 集計は inspectionItemRowsOf(@/store/selectors。稼働機器×有効項目×導出ステータスを一元化)の
 *   結果に対し、hooks.ts の純関数(countByStatus / actionRequiredRows / latestNotifications)を適用する。
 * - 遷移(カード→項目一覧プリフィルタ / 行→機器詳細)は useSafeNavigate を子へ渡し、本体は薄いビューに保つ。
 */

import { ActionRequiredList } from "@/features/dashboard/components/ActionRequiredList";
import { NotificationList } from "@/features/dashboard/components/NotificationList";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import { actionRequiredRows, countByStatus, latestNotifications } from "@/features/dashboard/hooks";
import { inspectionItemRowsOf } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import { useSafeNavigate } from "@/utils/navigation";
import { todayIsoDate } from "@/utils/time";
import { useMemo, type ReactElement } from "react";

export const Dashboard = (): ReactElement => {
  const safeNavigate = useSafeNavigate();
  const inspectionItems = useAppStore((state) => state.inspectionItems);
  const equipment = useAppStore((state) => state.equipment);
  const orders = useAppStore((state) => state.orders);
  const vendors = useAppStore((state) => state.vendors);
  const persons = useAppStore((state) => state.persons);
  const notifications = useAppStore((state) => state.notifications);

  const rows = useMemo(
    () =>
      inspectionItemRowsOf(
        { inspectionItems, equipment, orders, vendors, persons },
        todayIsoDate(),
      ),
    [inspectionItems, equipment, orders, vendors, persons],
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
