/**
 * 担当者マスタ画面（screen-design/09-masters.md §9-B）の状態管理フック。
 * UI（index.tsx）を薄いビューに保つため切り出す（coding-standards.md §2）。
 */

import type { Person } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useState } from "react";

/** persons を購読し、氏名の日本語ロケール昇順で返す */
export const usePersonList = (): Person[] => {
  const persons = useAppStore((state) => state.persons);
  return Object.values(persons).toSorted((first, second) =>
    first.name.localeCompare(second.name, "ja"),
  );
};

type ModalState = {
  open: boolean;
  person?: Person;
};

type UsePersonModalResult = {
  modalState: ModalState;
  handleAddClick: () => void;
  handleEditClick: (person: Person) => void;
  handleModalClose: () => void;
};

/** 追加/編集モーダルの開閉状態（person 未指定 = 追加、指定 = 編集） */
export const usePersonModal = (): UsePersonModalResult => {
  const [modalState, setModalState] = useState<ModalState>({ open: false });

  return {
    modalState,
    handleAddClick: (): void => setModalState({ open: true, person: undefined }),
    handleEditClick: (person: Person): void => setModalState({ open: true, person }),
    handleModalClose: (): void => setModalState({ open: false, person: undefined }),
  };
};
