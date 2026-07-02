/**
 * 担当者スライス（store.md「スライス構成」）。
 * Personは物理削除せず isActive=false で無効化する（domain-model.md §3.2）。
 */

import type { AppSliceCreator } from "@/store/storeState";
import type { Person } from "@/store/types";
import { createId } from "@/utils/id";

export type PersonSlice = {
  persons: Record<string, Person>;
  /** @returns 生成したPersonのid */
  addPerson: (input: Omit<Person, "id">) => string;
  updatePerson: (id: string, patch: Partial<Omit<Person, "id">>) => void;
  setPersonActive: (id: string, isActive: boolean) => void;
};

export const createPersonSlice: AppSliceCreator<PersonSlice> = (set) => ({
  persons: {},

  addPerson: (input): string => {
    const id = createId();
    set((state) => {
      state.persons[id] = { ...input, id };
    });
    return id;
  },

  updatePerson: (id, patch): void => {
    set((state) => {
      const person = state.persons[id];
      if (!person) return;
      Object.assign(person, patch);
    });
  },

  setPersonActive: (id, isActive): void => {
    set((state) => {
      const person = state.persons[id];
      if (!person) return;
      person.isActive = isActive;
    });
  },
});
