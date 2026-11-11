/**
 * ボードの防御的な表示（D-106 / D-109）: 遷移拒否のエラー表示、返却済の中止、
 * 「期限管理対象外」「案件重複」バッジ。通常フローは board.test.tsx / integration.test.tsx が担う。
 */

import { ServiceOrderList } from '@/features/serviceOrder';
import { TRANSITION_REJECTED_MESSAGE } from '@/features/serviceOrder/constants';
import {
  EQUIPMENT_STATUS,
  SERVICE_ORDER_STATUS,
  type Equipment,
  type ServiceOrder,
  type ServiceOrderStatus,
} from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { serviceOrderDatesFor, toServiceItem, toServiceOrder } from '@/test/entityBuilders';
import { renderWithStore, seedStore, setupStoreIsolation } from '@/test/renderWithStore';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';

const equipment: Equipment = {
  id: 'equipment-1',
  managementNo: 'EQ-001',
  name: 'ノギス',
  status: EQUIPMENT_STATUS.ACTIVE,
};
const serviceItem = toServiceItem({
  id: 'item-1',
  equipmentId: equipment.id,
  type: 'calibration',
  name: '年次校正',
  cycle: '1Y',
  execution: 'external',
  vendorId: 'vendor-1',
  bufferDays: 14,
  personId: 'person-1',
  noticeDaysBefore: 30,
  nextDueDate: '2026-07-10',
  isActive: true,
});
const orderWith = (status: ServiceOrderStatus, id = 'order-1'): ServiceOrder =>
  toServiceOrder({
    id,
    serviceItemId: serviceItem.id,
    vendorId: 'vendor-1',
    status,
    ...serviceOrderDatesFor(status),
  });

const seed = (serviceOrders: ServiceOrder[], equipmentOverride: Equipment = equipment): void => {
  seedStore({
    vendors: {
      'vendor-1': { id: 'vendor-1', name: '校正社', isManufacturer: false, isCalibrator: true },
    },
    equipment: { [equipment.id]: equipmentOverride },
    serviceItems: { [serviceItem.id]: serviceItem },
    serviceOrders: Object.fromEntries(serviceOrders.map((order) => [order.id, order])),
  });
};
/** 画面を開いたまま、別の操作で案件の状態が変わった状況を作る */
const replaceOrder = (order: ServiceOrder): void => {
  act(() => {
    seedStore({ serviceOrders: { [order.id]: order } });
  });
};

beforeEach(setupStoreIsolation);

describe('遷移の拒否', () => {
  it('中止の確認中に案件が完了していたら、中止せずエラーを表示する', async () => {
    const user = userEvent.setup();
    seed([orderWith(SERVICE_ORDER_STATUS.RETURNED)]);
    renderWithStore(<ServiceOrderList />);

    await user.click(screen.getByRole('button', { name: '中止' }));
    replaceOrder(orderWith(SERVICE_ORDER_STATUS.COMPLETED));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '中止' }));

    expect(screen.getByRole('alert')).toHaveTextContent(TRANSITION_REJECTED_MESSAGE);
    expect(useAppStore.getState().serviceOrders['order-1'].status).toBe(
      SERVICE_ORDER_STATUS.COMPLETED,
    );
  });

  it('発注ダイアログの入力中に案件が中止されていたら、発注せずダイアログ内にエラーを表示する', async () => {
    const user = userEvent.setup();
    seed([orderWith(SERVICE_ORDER_STATUS.PLANNED)]);
    renderWithStore(<ServiceOrderList />);

    await user.click(screen.getByRole('button', { name: '発注する' }));
    replaceOrder(orderWith(SERVICE_ORDER_STATUS.CANCELLED));
    await user.click(screen.getByRole('button', { name: '確定' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(TRANSITION_REJECTED_MESSAGE);
    expect(useAppStore.getState().serviceOrders['order-1'].status).toBe(
      SERVICE_ORDER_STATUS.CANCELLED,
    );
  });
});

describe('返却済の中止', () => {
  it('返却済の案件を中止できる', async () => {
    const user = userEvent.setup();
    seed([orderWith(SERVICE_ORDER_STATUS.RETURNED)]);
    renderWithStore(<ServiceOrderList />);

    await user.click(screen.getByRole('button', { name: '中止' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '中止' }));

    expect(useAppStore.getState().serviceOrders['order-1'].status).toBe(
      SERVICE_ORDER_STATUS.CANCELLED,
    );
  });
});

describe('注意バッジ', () => {
  it('通常の案件にはバッジも警告も出さない', () => {
    seed([orderWith(SERVICE_ORDER_STATUS.ORDERED)]);
    renderWithStore(<ServiceOrderList />);

    expect(screen.queryByText('期限管理対象外')).not.toBeInTheDocument();
    expect(screen.queryByText('案件重複')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('廃棄した機器の進行中案件に「期限管理対象外」を付ける', () => {
    seed([orderWith(SERVICE_ORDER_STATUS.ORDERED)], {
      ...equipment,
      status: EQUIPMENT_STATUS.RETIRED,
    });
    renderWithStore(<ServiceOrderList />);

    expect(screen.getByText('期限管理対象外')).toBeInTheDocument();
  });

  it('同じ項目に有効な案件が複数あると「案件重複」と警告を出す', () => {
    seed([
      orderWith(SERVICE_ORDER_STATUS.PLANNED, 'order-1'),
      orderWith(SERVICE_ORDER_STATUS.ORDERED, 'order-2'),
    ]);
    renderWithStore(<ServiceOrderList />);

    expect(screen.getAllByText('案件重複')).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('進行中の案件が複数あります');
  });
});
