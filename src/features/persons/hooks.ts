/**
 * 担当者マスタ画面（screen-design/09-masters.md §9-B）の状態管理フック。
 * UI（index.tsx）を薄いビューに保つため切り出す（coding-standards.md §2）。
 */

import type { Person } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";

/** persons を購読し、氏名の日本語ロケール昇順で返す */
export const usePersonList = (): Person[] => {
  const persons = useAppStore((state) => state.persons);
  return Object.values(persons).toSorted((left, right) =>
    left.name.localeCompare(right.name, "ja"),
  );
};
