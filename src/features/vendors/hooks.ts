/**
 * 削除は参照ガード付き: Equipment.manufacturerId / ServiceItem.vendorId /
 * ServiceOrder.vendorId のいずれかから参照されている Vendor は削除できない。
 */

import { isVendorReferenced } from '@/store/selectors';
import type { Vendor } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { matchesSearchText } from '@/utils/search';
import { useMemo, useState } from 'react';

const matchesSearch = (vendor: Vendor, normalizedSearch: string): boolean =>
  matchesSearchText(
    [vendor.name, vendor.contactPerson, vendor.phone, vendor.email],
    normalizedSearch,
  );

type UseVendorListResult = {
  totalCount: number;
  filteredVendorList: Vendor[];
  searchText: string;
  setSearchText: (value: string) => void;
};

export const useVendorList = (): UseVendorListResult => {
  const vendors = useAppStore((state) => state.vendors);
  const [searchText, setSearchText] = useState('');

  const totalCount = Object.keys(vendors).length;

  const filteredVendorList = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return Object.values(vendors)
      .filter((entry) => matchesSearch(entry, normalizedSearch))
      .toSorted((left, right) => left.name.localeCompare(right.name, 'ja'));
  }, [vendors, searchText]);

  return {
    totalCount,
    filteredVendorList,
    searchText,
    setSearchText,
  };
};

export const VENDOR_DELETE_DIALOG = {
  /** 削除確認ダイアログ */
  CONFIRM: 'confirm',
  /** 「参照されているため削除できません」ダイアログ */
  REFERENCED: 'referenced',
} as const;

/** 削除確認と参照エラーは同時に開かない(排他)ため 1 つの union で持つ。null = どちらも閉 */
export type VendorDeleteDialog =
  | { kind: typeof VENDOR_DELETE_DIALOG.CONFIRM; vendorId: string }
  | { kind: typeof VENDOR_DELETE_DIALOG.REFERENCED };

type UseVendorDeleteResult = {
  dialog: VendorDeleteDialog | null;
  handleDeleteClick: (vendorId: string) => void;
  handleConfirmDelete: () => void;
  closeDialog: () => void;
};

export const useVendorDelete = (): UseVendorDeleteResult => {
  const removeVendor = useAppStore((state) => state.removeVendor);
  const [dialog, setDialog] = useState<VendorDeleteDialog | null>(null);

  const handleDeleteClick = (vendorId: string): void => {
    if (isVendorReferenced(useAppStore.getState(), vendorId)) {
      setDialog({ kind: VENDOR_DELETE_DIALOG.REFERENCED });
      return;
    }
    setDialog({ kind: VENDOR_DELETE_DIALOG.CONFIRM, vendorId });
  };

  const handleConfirmDelete = (): void => {
    if (dialog?.kind !== VENDOR_DELETE_DIALOG.CONFIRM) return;
    const succeeded = removeVendor(dialog.vendorId);
    // なぜ: 確認ダイアログ表示中に別経路で参照が発生した競合等、false 返却時も
    // 「参照されているため削除できません」表示にフォールバックする。
    setDialog(succeeded ? null : { kind: VENDOR_DELETE_DIALOG.REFERENCED });
  };

  return {
    dialog,
    handleDeleteClick,
    handleConfirmDelete,
    closeDialog: (): void => {
      setDialog(null);
    },
  };
};
