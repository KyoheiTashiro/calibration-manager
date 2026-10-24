import { sortNotifications } from '@/features/notifications/hooks';
import {
  NOTIFICATION_TARGET_TYPE,
  NOTIFICATION_TYPE,
  type IsoDateString,
  type Notification,
} from '@/store/types';
import { describe, expect, it } from 'vitest';

const buildNotification = (id: string, createdDate: IsoDateString): Notification => ({
  id,
  type: NOTIFICATION_TYPE.DUE_SOON,
  targetType: NOTIFICATION_TARGET_TYPE.SERVICE_ITEM,
  targetId: 'item-1',
  personId: 'person-1',
  message: '',
  createdDate,
  isRead: false,
});

describe('sortNotifications', () => {
  it('createdDate 降順、同日は id のコード単位昇順（ロケール照合に依存しない）', () => {
    const sorted = sortNotifications([
      buildNotification('a', '2026-01-01'),
      buildNotification('B', '2026-01-01'),
      buildNotification('z', '2026-02-01'),
    ]);

    expect(sorted.map((notification) => notification.id)).toEqual(['z', 'B', 'a']);
  });
});
