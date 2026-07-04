/**
 * メーカー/取引先マスタ画面（screen-design/09-masters.md §9-A）の状態管理フック。
 * UI（index.tsx）を薄いビューに保つため切り出す（coding-standards.md §2）。
 *
 * 削除は参照ガード付き: Equipment.manufacturerId / InspectionItem.vendorId /
 * CalibrationOrder.vendorId のいずれかから参照されている Vendor は削除できない。
 */

import type { Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useState } from "react";

/** 参照されている Vendor は削除ガード対象（store の removeVendor と同じ判定条件） */
const isVendorReferenced = (vendorId: string): boolean => {
  const { equipment, inspectionItems, orders } = useAppStore.getState();
  return (
    Object.values(equipment).some((entry) => entry.manufacturerId === vendorId) ||
    Object.values(inspectionItems).some((entry) => entry.vendorId === vendorId) ||
    Object.values(orders).some((entry) => entry.vendorId === vendorId)
  );
};

/** vendors を購読し、名称の日本語ロケール昇順で返す */
export const useVendorList = (): Vendor[] => {
  const vendors = useAppStore((state) => state.vendors);
  return Object.values(vendors).toSorted((left, right) =>
    left.name.localeCompare(right.name, "ja"),
  );
};

type ModalState = {
  open: boolean;
  vendor?: Vendor;
};

type UseVendorModalResult = {
  modalState: ModalState;
  handleAddClick: () => void;
  handleEditClick: (vendor: Vendor) => void;
  handleModalClose: () => void;
};

/** 追加/編集モーダルの開閉状態（vendor 未指定 = 追加、指定 = 編集） */
export const useVendorModal = (): UseVendorModalResult => {
  const [modalState, setModalState] = useState<ModalState>({ open: false });

  return {
    modalState,
    handleAddClick: (): void => setModalState({ open: true, vendor: undefined }),
    handleEditClick: (vendor: Vendor): void => setModalState({ open: true, vendor }),
    handleModalClose: (): void => setModalState({ open: false, vendor: undefined }),
  };
};

type UseVendorDeleteResult = {
  /** 削除確認ダイアログの対象 Vendor id（undefined = 非表示） */
  deleteTargetId: string | undefined;
  /** 「参照されているため削除できません」モーダルの表示状態 */
  referencedErrorOpen: boolean;
  handleDeleteClick: (vendorId: string) => void;
  handleConfirmDelete: () => void;
  handleCancelDelete: () => void;
  closeReferencedError: () => void;
};

/** 削除フロー一式（参照ガード → 確認ダイアログ → removeVendor → 失敗時エラー表示） */
export const useVendorDelete = (): UseVendorDeleteResult => {
  const removeVendor = useAppStore((state) => state.removeVendor);
  const [deleteTargetId, setDeleteTargetId] = useState<string>();
  const [referencedErrorOpen, setReferencedErrorOpen] = useState(false);

  const handleDeleteClick = (vendorId: string): void => {
    if (isVendorReferenced(vendorId)) {
      setReferencedErrorOpen(true);
      return;
    }
    setDeleteTargetId(vendorId);
  };

  const handleConfirmDelete = (): void => {
    if (deleteTargetId === undefined) return;
    const succeeded = removeVendor(deleteTargetId);
    setDeleteTargetId(undefined);
    // なぜ: 確認ダイアログ表示中に別経路で参照が発生した競合等、false 返却時も
    // 「参照されているため削除できません」表示にフォールバックする（タスク仕様）。
    if (!succeeded) {
      setReferencedErrorOpen(true);
    }
  };

  return {
    deleteTargetId,
    referencedErrorOpen,
    handleDeleteClick,
    handleConfirmDelete,
    handleCancelDelete: (): void => setDeleteTargetId(undefined),
    closeReferencedError: (): void => setReferencedErrorOpen(false),
  };
};
