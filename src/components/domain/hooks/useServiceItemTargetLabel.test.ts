import { useServiceItemTargetLabel } from '@/components/domain/hooks/useServiceItemTargetLabel';
import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  SERVICE_ITEM_TYPE,
  type Equipment,
  type ServiceItem,
} from '@/store/types';
import { seedStore, setupStoreIsolation } from '@/test/renderWithStore';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(setupStoreIsolation);

const equipment: Equipment = {
  id: 'equipment-1',
  managementNo: 'EQ-001',
  name: 'ノギス',
  status: EQUIPMENT_STATUS.ACTIVE,
};

const serviceItem: ServiceItem = {
  id: 'item-1',
  equipmentId: equipment.id,
  type: SERVICE_ITEM_TYPE.CALIBRATION,
  name: '年次校正',
  cycle: CYCLE.Y1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: 'person-1',
  noticeDaysBefore: 30,
  nextDueDate: '2026-08-01',
  isActive: true,
};

describe('useServiceItemTargetLabel', () => {
  it('「対象:管理番号 機器名 / 項目名」を返す', () => {
    seedStore({
      equipment: { [equipment.id]: equipment },
      serviceItems: { [serviceItem.id]: serviceItem },
    });

    const { result } = renderHook(() => useServiceItemTargetLabel(serviceItem.id));

    expect(result.current).toBe('対象:EQ-001 ノギス / 年次校正');
  });

  it('項目が見つからなければ代替文言を返す', () => {
    const { result } = renderHook(() => useServiceItemTargetLabel('missing'));

    expect(result.current).toBe('対象:(項目情報が見つかりません)');
  });

  it('機器が見つからなければ代替文言を返す', () => {
    seedStore({ serviceItems: { [serviceItem.id]: serviceItem } });

    const { result } = renderHook(() => useServiceItemTargetLabel(serviceItem.id));

    expect(result.current).toBe('対象:(項目情報が見つかりません)');
  });
});
