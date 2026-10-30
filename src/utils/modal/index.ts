import { useState } from 'react';

/** entity は open 時のみ持てる(undefined = 新規追加)。閉じている間に entity が残る状態を型で禁止する */
export type EntityModalState<Entity> = { open: false } | { open: true; entity?: Entity };

export type UseEntityModalResult<Entity> = {
  modalState: EntityModalState<Entity>;
  handleAddClick: () => void;
  handleEditClick: (entity: Entity) => void;
  handleModalClose: () => void;
};

export const useEntityModal = <Entity>(): UseEntityModalResult<Entity> => {
  const [modalState, setModalState] = useState<EntityModalState<Entity>>({
    open: false,
  });

  return {
    modalState,
    handleAddClick: (): void => {
      setModalState({ open: true, entity: undefined });
    },
    handleEditClick: (entity: Entity): void => {
      setModalState({ open: true, entity });
    },
    handleModalClose: (): void => {
      setModalState({ open: false });
    },
  };
};
