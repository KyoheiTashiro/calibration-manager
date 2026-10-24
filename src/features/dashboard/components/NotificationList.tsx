import { EmptyState } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { NotificationTypeBadge } from '@/features/notifications/components/NotificationTypeBadge';
import type { Notification } from '@/store/types';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  notifications: readonly Notification[];
};

export const NotificationList = ({ notifications }: Props): ReactElement => (
  <section className='flex flex-col gap-2'>
    <div className='flex items-center justify-between'>
      <h2 className='text-lg font-semibold'>最新の通知</h2>
      <Link to={ROUTES.NOTIFICATION_LIST} className='text-primary text-sm underline'>
        通知一覧へ
      </Link>
    </div>
    {notifications.length === 0 ? (
      <EmptyState message='新しい通知はありません' />
    ) : (
      <ul className='divide-y divide-slate-200 rounded-lg border border-slate-200'>
        {notifications.map((notification) => (
          <li key={notification.id} className='flex items-center gap-3 px-3 py-2'>
            <NotificationTypeBadge type={notification.type} />
            <span className='flex-1 text-sm'>{notification.message}</span>
            <span className='text-xs text-slate-500 tabular-nums'>{notification.createdDate}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);
