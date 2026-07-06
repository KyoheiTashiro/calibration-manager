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
