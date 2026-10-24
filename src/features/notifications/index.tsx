import { Button, ConfirmModal, EmptyState, Pagination, Tabs, usePagination } from '@/components/ui';
import { NotificationTypeBadge } from '@/features/notifications/components/NotificationTypeBadge';
import {
  isNotificationTab,
  NOTIFICATION_TAB,
  resolveNotificationTarget,
  selectTabNotifications,
  type NotificationTab,
} from '@/features/notifications/hooks';
import { unreadNotificationCount } from '@/store/selectors';
import type { Notification } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { useSafeNavigate } from '@/utils/navigation';
import { useState, type ReactElement } from 'react';

export const NotificationCenter = (): ReactElement => {
  const safeNavigate = useSafeNavigate();
  const notifications = useAppStore((state) => state.notifications);
  const serviceItems = useAppStore((state) => state.serviceItems);
  const markAsRead = useAppStore((state) => state.markAsRead);
  const markAllAsRead = useAppStore((state) => state.markAllAsRead);
  const unreadCount = useAppStore((state) => unreadNotificationCount(state));

  const [activeTab, setActiveTab] = useState<NotificationTab>(NOTIFICATION_TAB.UNREAD);
  const [markAllConfirmOpen, setMarkAllConfirmOpen] = useState(false);

  const rows = selectTabNotifications(Object.values(notifications), activeTab);
  const pagination = usePagination(rows, activeTab);

  const handleRowClick = (notification: Notification): void => {
    markAsRead(notification.id);
    const target = resolveNotificationTarget(notification, serviceItems);
    if (target !== null) {
      safeNavigate(target);
    }
  };

  const tabs = [
    { key: NOTIFICATION_TAB.UNREAD, label: `未読(${unreadCount})` },
    { key: NOTIFICATION_TAB.READ, label: '既読' },
  ] as const;

  const emptyMessage =
    activeTab === NOTIFICATION_TAB.UNREAD ? '未読の通知はありません' : '既読の通知はありません';

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-xl font-bold'>通知一覧</h1>
      <Tabs
        tabs={tabs}
        activeKey={activeTab}
        onChange={(key): void => {
          if (isNotificationTab(key)) setActiveTab(key);
        }}
        actions={
          <Button
            variant='secondary'
            disabled={unreadCount === 0}
            onClick={(): void => {
              setMarkAllConfirmOpen(true);
            }}
          >
            全て既読
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <ul className='flex flex-col divide-y divide-slate-200 border-b border-slate-200'>
          {pagination.pagedItems.map((notification) => (
            <li key={notification.id}>
              <button
                type='button'
                onClick={(): void => {
                  handleRowClick(notification);
                }}
                className='flex w-full flex-col gap-1 px-2 py-3 text-left hover:bg-slate-50'
              >
                <div className='flex items-center gap-2'>
                  <NotificationTypeBadge type={notification.type} />
                  <span className='text-sm text-slate-800'>{notification.message}</span>
                </div>
                <span className='text-xs text-slate-500'>{notification.createdDate}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={markAllConfirmOpen}
        title='全て既読'
        message='未読の通知をすべて既読にしますか?'
        confirmLabel='既読にする'
        variant='primary'
        onConfirm={(): void => {
          markAllAsRead();
          setMarkAllConfirmOpen(false);
        }}
        onCancel={(): void => {
          setMarkAllConfirmOpen(false);
        }}
      />

      {rows.length > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      )}
    </div>
  );
};
