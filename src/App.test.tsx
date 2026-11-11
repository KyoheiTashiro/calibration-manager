import App from '@/App';
import type { Notification } from '@/store/types';
import { toNotification, toServiceItem } from '@/test/entityBuilders';
import { renderWithStore, seedStore, setupStoreIsolation } from '@/test/renderWithStore';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

// なぜ beforeEach(setupStoreIsolation) が必須か: HeaderがunreadNotificationCountを
// 購読しており、テスト間でストア・LocalStorageの状態が持ち越されると
// 未読バッジの表示が前のテストの影響を受けてしまうため。

const buildNotification = (overrides: Partial<Notification> = {}): Notification =>
  toNotification({
    id: 'notification-1',
    type: 'dueSoon',
    targetType: 'serviceItem',
    targetId: 'item-1',
    personId: 'person-1',
    message: 'テスト通知',
    createdDate: '2026-07-01',
    isRead: false,
    ...overrides,
  });

describe('主要ルートのプレースホルダ表示', () => {
  beforeEach(setupStoreIsolation);

  // 各画面は画面タイトル(h1)を表示する(D-095)
  it.each([
    ['/', 'ダッシュボード'],
    ['/equipment', '機器一覧'],
    ['/service-items', '点検校正項目一覧'],
    ['/vendors', 'メーカー/取引先一覧'],
    ['/persons', '担当者一覧'],
    ['/notifications', '通知一覧'],
    ['/settings', '設定'],
  ])('%s は見出し「%s」を表示する', (path, heading) => {
    renderWithStore(<App />, { initialEntries: [path] });

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});

describe('サイドバーのナビゲーション', () => {
  beforeEach(setupStoreIsolation);

  it('メインナビゲーションのリンクが9項目ある', () => {
    renderWithStore(<App />);

    const navigation = screen.getByRole('navigation', { name: 'メインナビゲーション' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(9);
  });
});

describe('未読通知バッジ', () => {
  beforeEach(setupStoreIsolation);

  it('未読通知をseedすると件数バッジを表示する', () => {
    // 起動時スキャンは発生条件を満たさない未読を取り下げる(D-108)ため、期限超過の項目ごと seed する
    seedStore({
      equipment: {
        'equipment-1': {
          id: 'equipment-1',
          managementNo: 'EQ-001',
          name: 'ノギス',
          status: 'active',
        },
      },
      serviceItems: {
        'item-1': toServiceItem({
          id: 'item-1',
          equipmentId: 'equipment-1',
          type: 'inspection',
          name: '月次点検',
          cycle: '1M',
          execution: 'internal',
          bufferDays: 14,
          personId: 'person-1',
          noticeDaysBefore: 30,
          nextDueDate: '2020-01-01',
          isActive: true,
        }),
      },
      notifications: { 'notification-1': buildNotification({ type: 'overdue' }) },
    });

    // ダッシュボードは期限超過件数にも「1」を出すため、件数表示のない画面で確かめる
    renderWithStore(<App />, { initialEntries: ['/persons'] });

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('未読通知が0件のとき件数バッジを表示しない', () => {
    seedStore({ notifications: {} });

    renderWithStore(<App />);

    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('既読のみのときも件数バッジを表示しない', () => {
    seedStore({
      notifications: { 'notification-1': buildNotification({ isRead: true }) },
    });

    renderWithStore(<App />);

    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});
