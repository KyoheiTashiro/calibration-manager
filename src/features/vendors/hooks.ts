/**
 * 削除は参照ガード付き: Equipment.manufacturerId / ServiceItem.vendorId /
 * ServiceOrder.vendorId のいずれかから参照されている Vendor は削除できない。
 */

import { isVendorReferenced } from '@/store/selectors';
import type { Vendor } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { useMemo, useState } from 'react';

const matchesSearch = (vendor: Vendor, normalizedSearch: string): boolean => {
  if (normalizedSearch === '') return true;
  const haystack = [vendor.name, vendor.contactPerson ?? '', vendor.phone ?? '', vendor.email ?? '']
    .join('\n')
    .toLowerCase();
  return haystack.includes(normalizedSearch);
};

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

type UseVendorDeleteResult = {
  deleteTargetId: string | undefined;
  referencedErrorOpen: boolean;
  handleDeleteClick: (vendorId: string) => void;
  handleConfirmDelete: () => void;
  handleCancelDelete: () => void;
  closeReferencedError: () => void;
};

export const useVendorDelete = (): UseVendorDeleteResult => {
  const removeVendor = useAppStore((state) => state.removeVendor);
  const [deleteTargetId, setDeleteTargetId] = useState<string>();
  const [referencedErrorOpen, setReferencedErrorOpen] = useState(false);

  const handleDeleteClick = (vendorId: string): void => {
    if (isVendorReferenced(useAppStore.getState(), vendorId)) {
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
    // 「参照されているため削除できません」表示にフォールバックする。
    if (!succeeded) {
      setReferencedErrorOpen(true);
    }
  };

  return {
    deleteTargetId,
    referencedErrorOpen,
    handleDeleteClick,
    handleConfirmDelete,
    handleCancelDelete: (): void => {
      setDeleteTargetId(undefined);
    },
    closeReferencedError: (): void => {
      setReferencedErrorOpen(false);
    },
  };
};
