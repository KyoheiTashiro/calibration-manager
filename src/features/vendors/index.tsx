/**
 * メーカー/取引先マスタ画面（screen-design/09-masters.md §9-A）。
 * 削除は参照ガード付き: Equipment.manufacturerId / InspectionItem.vendorId /
 * CalibrationOrder.vendorId のいずれかから参照されている Vendor は削除できない。
 */

import { VendorModal } from "@/components/domain/VendorModal";
import { Button, ConfirmModal, EmptyState, Modal, Table, TableBody, TableHead } from "@/components/ui";
import type { Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useState, type ReactElement } from "react";

/** 参照されている Vendor は削除ガード対象（store の removeVendor と同じ判定条件） */
const isVendorReferenced = (vendorId: string): boolean => {
  const { equipment, items, orders } = useAppStore.getState();
  return (
    Object.values(equipment).some((entry) => entry.manufacturerId === vendorId) ||
    Object.values(items).some((entry) => entry.vendorId === vendorId) ||
    Object.values(orders).some((entry) => entry.vendorId === vendorId)
  );
};

type ModalState = {
  open: boolean;
  vendor?: Vendor;
};

export const VendorList = (): ReactElement => {
  const vendors = useAppStore((state) => state.vendors);
  const removeVendor = useAppStore((state) => state.removeVendor);

  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const [deleteTargetId, setDeleteTargetId] = useState<string>();
  const [referencedErrorOpen, setReferencedErrorOpen] = useState(false);

  const vendorList = Object.values(vendors).toSorted((left, right) =>
    left.name.localeCompare(right.name, "ja"),
  );

  const handleAddClick = (): void => setModalState({ open: true, vendor: undefined });
  const handleEditClick = (vendor: Vendor): void => setModalState({ open: true, vendor });
  const handleModalClose = (): void => setModalState({ open: false, vendor: undefined });

  const handleDeleteClick = (vendorId: string): void => {
    if (isVendorReferenced(vendorId)) {
      setReferencedErrorOpen(true);
      return;
    }
    setDeleteTargetId(vendorId);
  };

  const handleCancelDelete = (): void => setDeleteTargetId(undefined);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">メーカー/取引先</h1>
        <Button onClick={handleAddClick}>+ 追加</Button>
      </div>

      {vendorList.length === 0 ? (
        <EmptyState
          message="取引先が未登録です"
          action={<Button onClick={handleAddClick}>+ 追加</Button>}
        />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <th scope="col" className="px-3 py-2 text-left">
                名称
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                メーカー
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                校正業者
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                標準納期
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                窓口
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                連絡先
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                操作
              </th>
            </tr>
          </TableHead>
          <TableBody>
            {vendorList.map((vendor) => (
              <tr key={vendor.id} className="h-10 hover:bg-slate-50">
                <td className="px-3 py-2">{vendor.name}</td>
                <td className="px-3 py-2">{vendor.isManufacturer ? "✓" : "—"}</td>
                <td className="px-3 py-2">{vendor.isCalibrator ? "✓" : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {vendor.standardLeadTimeDays === undefined
                    ? "—"
                    : `${vendor.standardLeadTimeDays}日`}
                </td>
                <td className="px-3 py-2">{vendor.contactPerson || "—"}</td>
                <td className="px-3 py-2">{vendor.phone || "—"}</td>
                {/* なぜ td 直下に Button を並べるか: div でラップして1階層深くすると
                    jsx-a11y(control-has-associated-label) の既定探索深度(2)を超えて
                    ボタン内テキストを検出できず誤検知するため、td を flex コンテナ化して
                    ラッパーを1段省く。 */}
                <td className="flex gap-2 px-3 py-2">
                  <Button variant="secondary" size="sm" onClick={() => handleEditClick(vendor)}>
                    編集
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteClick(vendor.id)}>
                    削除
                  </Button>
                </td>
              </tr>
            ))}
          </TableBody>
        </Table>
      )}

      <VendorModal open={modalState.open} vendor={modalState.vendor} onClose={handleModalClose} />

      <ConfirmModal
        open={deleteTargetId !== undefined}
        title="取引先の削除"
        message="この取引先を削除しますか?"
        confirmLabel="削除"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <Modal
        open={referencedErrorOpen}
        title="削除できません"
        onClose={() => setReferencedErrorOpen(false)}
      >
        <p role="alert" className="text-sm text-slate-700">
          この取引先は参照されているため削除できません
        </p>
        <div className="flex justify-end pt-4">
          <Button onClick={() => setReferencedErrorOpen(false)}>OK</Button>
        </div>
      </Modal>
    </div>
  );
};
