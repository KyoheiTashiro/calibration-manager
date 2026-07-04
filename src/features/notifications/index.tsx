/**
 * 通知センター画面（screen-design/10-notifications.md）。
 * 未読/既読タブでアプリ内通知を閲覧し、行クリックで対象へ遷移・既読化する。
 *
 * - 並び替え・タブ絞り込み・遷移先解決は hooks.ts の純関数へ委譲し、本コンポーネントは薄いビューに保つ。
 * - 種別バッジは NOTIFICATION_TYPE_BADGE_CLASSES + NOTIFICATION_TYPE_LABELS で「色 + 日本語ラベル」を
 *   併記する（README §0.3。色のみ禁止）。
 * - 行クリックは D-027 に従い、まず markAsRead、次に遷移先が解決できれば navigate する。
 */

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
import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";

export const NotificationCenter = (): ReactElement => {
  const navigate = useNavigate();
  const notifications = useAppStore((state) => state.notifications);
  const inspectionItems = useAppStore((state) => state.inspectionItems);
  const markAsRead = useAppStore((state) => state.markAsRead);
  const markAllAsRead = useAppStore((state) => state.markAllAsRead);
  const unreadCount = useAppStore((state) => unreadNotificationCount(state));

  const [activeTab, setActiveTab] = useState<NotificationTab>(NOTIFICATION_TAB.UNREAD);

  const rows = selectTabNotifications(Object.values(notifications), activeTab);

  // 行クリック（D-027）: まず既読化、次に遷移先が解決できれば遷移。dangling inspectionItem は既読化のみ。
  const handleRowClick = (notification: Notification): void => {
    markAsRead(notification.id);
    const target = resolveNotificationTarget(notification, inspectionItems);
    if (target !== null) {
      // なぜ Promise.resolve().catch() か: navigate() は react-router 7 で
      // `void | Promise<void>` を返す。遷移完了を待つ必要はなく、失敗時も
      // 通知一覧の表示に影響しないため、両方の戻り値を統一的に無視する。
      Promise.resolve(navigate(target)).catch(() => {
        // 遷移エラーは無視する
      });
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
          {rows.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                onClick={(): void => {
                  handleRowClick(notification);
                }}
                className="flex w-full flex-col gap-1 px-2 py-3 text-left hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  {/* oxlint-disable-next-line react/forbid-component-props -- BadgeはclassNameで色を渡す設計(Badge.tsx参照) */}
                  <Badge className={NOTIFICATION_TYPE_BADGE_CLASSES[notification.type]}>
                    {/* Badge は inline-flex のため空白テキストノードが消える。間隔は margin で確保 */}
                    <span aria-hidden="true" className="mr-1">
                      {NOTIFICATION_TYPE_ICONS[notification.type]}
                    </span>
                    {NOTIFICATION_TYPE_LABELS[notification.type]}
                  </Badge>
                  <span className="text-sm text-slate-800">{notification.message}</span>
                </div>
                <span className="text-xs text-slate-500">{notification.createdDate}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
