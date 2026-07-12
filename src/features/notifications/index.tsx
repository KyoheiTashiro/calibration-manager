import { Badge, Button, EmptyState, Tabs } from "@/components/ui";
import {
  NOTIFICATION_TYPE_BADGE_CLASSES,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_LABELS,
} from "@/features/notifications/constants";
import {
  isNotificationTab,
  NOTIFICATION_TAB,
  resolveNotificationTarget,
  selectTabNotifications,
  type NotificationTab,
} from "@/features/notifications/hooks";
import { unreadNotificationCount } from "@/store/selectors";
import type { Notification } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useSafeNavigate } from "@/utils/navigation";
import { useState, type ReactElement } from "react";

export const NotificationCenter = (): ReactElement => {
  const safeNavigate = useSafeNavigate();
  const notifications = useAppStore((state) => state.notifications);
  const serviceItems = useAppStore((state) => state.serviceItems);
  const markAsRead = useAppStore((state) => state.markAsRead);
  const markAllAsRead = useAppStore((state) => state.markAllAsRead);
  const unreadCount = useAppStore((state) => unreadNotificationCount(state));

  const [activeTab, setActiveTab] = useState<NotificationTab>(NOTIFICATION_TAB.UNREAD);

  const rows = selectTabNotifications(Object.values(notifications), activeTab);

  const handleRowClick = (notification: Notification): void => {
    markAsRead(notification.id);
    const target = resolveNotificationTarget(notification, serviceItems);
    if (target !== null) {
      safeNavigate(target);
    }
  };

  const tabs = [
    { key: NOTIFICATION_TAB.UNREAD, label: `未読(${unreadCount})` },
    { key: NOTIFICATION_TAB.READ, label: "既読" },
  ] as const;

  const emptyMessage =
    activeTab === NOTIFICATION_TAB.UNREAD ? "未読の通知はありません" : "既読の通知はありません";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">通知センター</h1>
        <Button
          variant="secondary"
          disabled={unreadCount === 0}
          onClick={(): void => {
            markAllAsRead();
          }}
        >
          全て既読
        </Button>
      </div>

      <Tabs
        tabs={tabs}
        activeKey={activeTab}
        onChange={(key): void => {
          if (isNotificationTab(key)) setActiveTab(key);
        }}
      />

      {rows.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <ul className="flex flex-col divide-y divide-slate-200 border-b border-slate-200">
          {rows.map((notification) => {
            const TypeIcon = NOTIFICATION_TYPE_ICONS[notification.type];
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={(): void => {
                    handleRowClick(notification);
                  }}
                  className="flex w-full flex-col gap-1 px-2 py-3 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={NOTIFICATION_TYPE_BADGE_CLASSES[notification.type]}>
                      <TypeIcon className="mr-1 h-3.5 w-3.5" />
                      {NOTIFICATION_TYPE_LABELS[notification.type]}
                    </Badge>
                    <span className="text-sm text-slate-800">{notification.message}</span>
                  </div>
                  <span className="text-xs text-slate-500">{notification.createdDate}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
