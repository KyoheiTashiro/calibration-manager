/**
 * ダッシュボードの「最新の通知」パネル(01-dashboard.md)。
 * 選定順(未読優先→新しい順→id昇順)・件数は hooks.ts の latestNotifications で確定済みのため、
 * ここは種別バッジ・message・createdDate の描画と「通知センターへ」リンクのみを担う薄いビュー。
 */

import { Badge, EmptyState } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { NOTIFICATION_TYPE_BADGE_CLASSES, NOTIFICATION_TYPE_LABELS } from "@/features/notifications/constants";
import type { Notification } from "@/store/types";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

type Props = {
  notifications: readonly Notification[];
};

export const NotificationList = ({ notifications }: Props): ReactElement => (
  <section className="flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">最新の通知</h2>
      {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(equipment/form 踏襲) */}
      <Link to={ROUTES.NOTIFICATION_LIST} className="text-primary text-sm underline">
        通知センターへ
      </Link>
    </div>
    {notifications.length === 0 ? (
      <EmptyState message="新しい通知はありません" />
    ) : (
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
        {notifications.map((notification) => (
          <li key={notification.id} className="flex items-center gap-3 px-3 py-2">
            {/* oxlint-disable-next-line react/forbid-component-props -- Badgeはclassnameで色を渡す設計(Badge.tsx参照) */}
            <Badge className={NOTIFICATION_TYPE_BADGE_CLASSES[notification.type]}>
              {NOTIFICATION_TYPE_LABELS[notification.type]}
            </Badge>
            <span className="flex-1 text-sm">{notification.message}</span>
            <span className="text-xs text-slate-500 tabular-nums">{notification.createdDate}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);
