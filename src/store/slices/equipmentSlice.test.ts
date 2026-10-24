import type { Equipment } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { setupStoreIsolation } from '@/test/renderWithStore';
import { beforeEach, describe, expect, it } from 'vitest';

const buildEquipmentInput = (
  overrides: Partial<Omit<Equipment, 'id'>> = {},
): Omit<Equipment, 'id'> => ({
  managementNo: 'EQ-0001',
  name: 'デジタルノギス',
  model: 'CD-15APX',
  serialNo: 'SN-12345',
  location: '第1工場',
  status: 'active',
  ...overrides,
});

describe('equipmentSlice', () => {
  beforeEach(setupStoreIsolation);

  describe('addEquipment', () => {
    it('生成したidを返し、そのidでequipmentに格納される', () => {
      const id = useAppStore.getState().addEquipment(buildEquipmentInput());

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(useAppStore.getState().equipment[id]).toEqual({ ...buildEquipmentInput(), id });
    });

    it('複数追加すると異なるidが払い出され、両方とも格納される', () => {
      const firstId = useAppStore
        .getState()
        .addEquipment(buildEquipmentInput({ managementNo: 'EQ-0002' }));
      const secondId = useAppStore
        .getState()
        .addEquipment(buildEquipmentInput({ managementNo: 'EQ-0003' }));

      expect(firstId).not.toBe(secondId);
      expect(Object.keys(useAppStore.getState().equipment)).toHaveLength(2);
    });
  });

  describe('updateEquipment', () => {
    it('指定フィールドのみ部分更新し、他フィールドは維持する', () => {
      const id = useAppStore.getState().addEquipment(buildEquipmentInput());

      useAppStore.getState().updateEquipment(id, { location: '第2工場' });

      expect(useAppStore.getState().equipment[id]).toEqual({
        ...buildEquipmentInput(),
        id,
        location: '第2工場',
      });
    });

    it('存在しないidを指定してもno-opで例外を投げない', () => {
      expect(() => {
        useAppStore.getState().updateEquipment('no-such-id', { name: '何か' });
      }).not.toThrow();
      expect(useAppStore.getState().equipment['no-such-id']).toBeUndefined();
    });
  });
});
