/**
 * Personは物理削除せず isActive=false で無効化する。
 */

import { addEntity, patchEntity } from '@/store/entityActions';
import type { AppSliceCreator } from '@/store/storeState';
import type { Person } from '@/store/types';

export type PersonSlice = {
  persons: Record<string, Person>;
  /** @returns 生成したPersonのid */
  addPerson: (input: Omit<Person, 'id'>) => string;
  updatePerson: (id: string, patch: Partial<Omit<Person, 'id'>>) => void;
};

export const createPersonSlice: AppSliceCreator<PersonSlice> = (set) => ({
  persons: {},

  addPerson: (input): string => addEntity(set, (state) => state.persons, input),

  updatePerson: (id, patch): void => {
    patchEntity(set, (state) => state.persons, id, patch);
  },
});
