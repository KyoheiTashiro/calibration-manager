/** 一覧ページネーション（screen-design/README.md §0.8 D-076）の適用確認 */

import { ROUTES } from '@/constants/routes';
import { NotificationCenter } from '@/features/notifications';
import { NOTIFICATION_TARGET_TYPE, NOTIFICATION_TYPE, type Notification } from '@/store/types';
import { renderWithStore, seedStore, setupStoreIsolation } from '@/test/renderWithStore';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

const NOTIFICATION_SEED_COUNT = 25;

const makeNotif = (
  idSuffix: string,
  dayOfMonth: number,
  overrides: Partial<Notification> = {},
): Notification => ({
  id: `notif-${idSuffix}`,
  type: NOTIFICATION_TYPE.OVERDUE,
  targetType: NOTIFICATION_TARGET_TYPE.SERVICE_ITEM,
  targetId: 'item-missing',
  personId: 'person-1',
  message: `通知${idSuffix}`,
  createdDate: `2026-06-${String(dayOfMonth).padStart(2, '0')}`,
  isRead: false,
  ...overrides,
});

const buildNotifications = (
  count: number,
  isRead: boolean,
  idPrefix: string,
): Record<string, Notification> => {
  const notifications: Record<string, Notification> = {};
  for (let index = 0; index < count; index += 1) {
    const suffix = `${idPrefix}${String(index).padStart(2, '0')}`;
    // dayOfMonth を index+1 とすることで createdDate 降順ソート時に index が大きいほど先頭に来る
    notifications[`notif-${suffix}`] = makeNotif(suffix, index + 1, { isRead });
  }
  return notifications;
};

const renderCenter = (): void => {
  renderWithStore(
    <Routes>
      <Route path={ROUTES.NOTIFICATION_LIST} element={<NotificationCenter />} />
    </Routes>,
    { initialEntries: [ROUTES.NOTIFICATION_LIST] },
  );
};

beforeEach(setupStoreIsolation);

describe('NotificationCenter: ページネーション', () => {
  it('21件以上あるとき1ページ目には20件のみ表示され、ページネーションが表示される', () => {
    seedStore({ notifications: buildNotifications(NOTIFICATION_SEED_COUNT, false, 'u') });
    renderCenter();

    expect(screen.getAllByRole('listitem')).toHaveLength(20);
    expect(screen.getByRole('navigation', { name: 'ページネーション' })).toBeInTheDocument();
    expect(screen.getByText(`全${NOTIFICATION_SEED_COUNT}件中 1–20件目`)).toBeInTheDocument();
  });

  it('次へ押下でページが切り替わり表示件が変わる', async () => {
    const user = userEvent.setup();
    seedStore({ notifications: buildNotifications(NOTIFICATION_SEED_COUNT, false, 'u') });
    renderCenter();

    // createdDate降順のため、最も古い通知（index0）は1ページ目には出ない
    expect(screen.queryByText('通知u00')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '次へ' }));

    expect(screen.getByText('通知u00')).toBeInTheDocument();
    expect(screen.getByText(`全${NOTIFICATION_SEED_COUNT}件中 21–25件目`)).toBeInTheDocument();
  });

  it('2ページ目でタブを切り替えると1ページ目に戻る', async () => {
    const user = userEvent.setup();
    seedStore({
      notifications: {
        ...buildNotifications(NOTIFICATION_SEED_COUNT, false, 'u'),
        ...buildNotifications(NOTIFICATION_SEED_COUNT, true, 'r'),
      },
    });
    renderCenter();

    await user.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.getByText(`全${NOTIFICATION_SEED_COUNT}件中 21–25件目`)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '既読' }));

    expect(screen.getByText(`全${NOTIFICATION_SEED_COUNT}件中 1–20件目`)).toBeInTheDocument();
  });
});
