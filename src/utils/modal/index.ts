/**
 * 追加/編集モーダルの開閉状態管理フック。
 * なぜ必要か: persons/vendors 等の各マスタ画面で「追加は entity 未指定、編集は entity 指定で
 * モーダルを開く」という同一パターンが逐語重複していたため、エンティティ型をジェネリックにして
 * 集約する（D-049）。
 */

import { useState } from "react";

export type EntityModalState<Entity> = {
  open: boolean;
  entity?: Entity;
};

export type UseEntityModalResult<Entity> = {
  modalState: EntityModalState<Entity>;
  handleAddClick: () => void;
  handleEditClick: (entity: Entity) => void;
  handleModalClose: () => void;
};

/** 追加/編集モーダルの開閉状態（entity 未指定 = 追加、指定 = 編集） */
export const useEntityModal = <Entity>(): UseEntityModalResult<Entity> => {
  const [modalState, setModalState] = useState<EntityModalState<Entity>>({ open: false });

  return {
    modalState,
    handleAddClick: (): void => {
      setModalState({ open: true, entity: undefined });
    },
    handleEditClick: (entity: Entity): void => {
      setModalState({ open: true, entity });
    },
    handleModalClose: (): void => {
      setModalState({ open: false, entity: undefined });
    },
  };
};
