/**
 * メーカー/取引先マスタ画面（screen-design/09-masters.md §9-A）。
 * 状態管理・削除参照ガードは hooks.ts に切り出し、本ファイルはビューに徹する。
 */

import { VendorModal } from "@/components/domain/VendorModal";
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  Modal,
  Table,
  TableBody,
  TableHead,
} from "@/components/ui";
import { useVendorDelete, useVendorList, useVendorModal } from "@/features/vendors/hooks";
import type { ReactElement } from "react";

// 種別バッジ: -100 背景 × -800 文字 × -300 枠線の組は statusBadge.ts と同じ WCAG AA 設計値
const MANUFACTURER_BADGE_CLASS_NAME = "bg-blue-100 text-blue-800 border border-blue-300";
const CALIBRATOR_BADGE_CLASS_NAME = "bg-emerald-100 text-emerald-800 border border-emerald-300";

export const VendorList = (): ReactElement => {
  const vendorList = useVendorList();

  const { modalState, handleAddClick, handleEditClick, handleModalClose } = useVendorModal();

  const {
    deleteTargetId,
    referencedErrorOpen,
    handleDeleteClick,
    handleConfirmDelete,
    handleCancelDelete,
    closeReferencedError,
  } = useVendorDelete();

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
                種別
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
                <td className="px-3 py-2">
                  {!vendor.isManufacturer && !vendor.isCalibrator ? (
                    "—"
                  ) : (
                    <span className="inline-flex gap-1">
                      {vendor.isManufacturer && (
                        // oxlint-disable-next-line react/forbid-component-props -- Badgeはclassnameで色を渡す設計（Badge.tsx参照）
                        <Badge className={MANUFACTURER_BADGE_CLASS_NAME}>メーカー</Badge>
                      )}
                      {vendor.isCalibrator && (
                        // oxlint-disable-next-line react/forbid-component-props -- Badgeはclassnameで色を渡す設計（Badge.tsx参照）
                        <Badge className={CALIBRATOR_BADGE_CLASS_NAME}>校正業者</Badge>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {vendor.standardLeadTimeDays === undefined
                    ? "—"
                    : `${vendor.standardLeadTimeDays}日`}
                </td>
                <td className="px-3 py-2">{vendor.contactPerson ?? "—"}</td>
                <td className="px-3 py-2">{vendor.phone ?? "—"}</td>
                {/* なぜ td 直下に Button を並べるか: div でラップして1階層深くすると
                    jsx-a11y(control-has-associated-label) の既定探索深度(2)を超えて
                    ボタン内テキストを検出できず誤検知するため、td を flex コンテナ化して
                    ラッパーを1段省く。 */}
                <td className="flex gap-2 px-3 py-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      handleEditClick(vendor);
                    }}
                  >
                    編集
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      handleDeleteClick(vendor.id);
                    }}
                  >
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

      <Modal open={referencedErrorOpen} title="削除できません" onClose={closeReferencedError}>
        <p role="alert" className="text-sm text-slate-700">
          この取引先は参照されているため削除できません
        </p>
        <div className="flex justify-end pt-4">
          <Button onClick={closeReferencedError}>OK</Button>
        </div>
      </Modal>
    </div>
  );
};
