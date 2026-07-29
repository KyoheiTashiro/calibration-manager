import { VendorModal } from "@/components/domain/VendorModal";
import {
  Button,
  ConfirmModal,
  EmptyState,
  Modal,
  Pagination,
  Table,
  TableBody,
  TableHead,
  Td,
  TextField,
  Th,
  usePagination,
} from "@/components/ui";
import { VendorTypeBadges } from "@/features/vendors/components/VendorTypeBadges";
import { useVendorDelete, useVendorList } from "@/features/vendors/hooks";
import type { Vendor } from "@/store/types";
import { useEntityModal } from "@/utils/modal";
import type { ReactElement } from "react";

export const VendorList = (): ReactElement => {
  const { totalCount, filteredVendorList, searchText, setSearchText } = useVendorList();
  const {
    page,
    pageSize,
    totalCount: pagedTotalCount,
    pagedItems,
    setPage,
    setPageSize,
  } = usePagination(filteredVendorList, searchText);

  const { modalState, handleAddClick, handleEditClick, handleModalClose } =
    useEntityModal<Vendor>();

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

      {totalCount === 0 ? (
        <EmptyState
          message="取引先が未登録です"
          action={<Button onClick={handleAddClick}>+ 追加</Button>}
        />
      ) : (
        <>
          <div className="w-1/2 min-w-64">
            <TextField
              label="検索"
              placeholder="名称/窓口/連絡先で検索"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
              }}
            />
          </div>

          {filteredVendorList.length === 0 ? (
            <EmptyState message="条件に一致する取引先はありません" />
          ) : (
            <Table>
              <TableHead>
                <tr>
                  <Th>名称</Th>
                  <Th>種別</Th>
                  <Th align="right">標準納期</Th>
                  <Th>窓口</Th>
                  <Th>連絡先</Th>
                  <Th>操作</Th>
                </tr>
              </TableHead>
              <TableBody>
                {pagedItems.map((vendor) => (
                  <tr key={vendor.id} className="h-10 hover:bg-slate-50">
                    <Td>{vendor.name}</Td>
                    <Td>
                      <VendorTypeBadges vendor={vendor} />
                    </Td>
                    <Td className="text-right tabular-nums">
                      {vendor.standardLeadTimeDays === undefined
                        ? "—"
                        : `${vendor.standardLeadTimeDays}日`}
                    </Td>
                    <Td>{vendor.contactPerson ?? "—"}</Td>
                    <Td>{vendor.phone ?? "—"}</Td>
                    {/* なぜ td 直下に Button を並べるか: div でラップして1階層深くすると
                        jsx-a11y(control-has-associated-label) の既定探索深度(2)を超えて
                        ボタン内テキストを検出できず誤検知するため、td を flex コンテナ化して
                        ラッパーを1段省く。 */}
                    <Td className="flex gap-2">
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
                    </Td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredVendorList.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={pagedTotalCount}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </>
      )}

      <VendorModal open={modalState.open} vendor={modalState.entity} onClose={handleModalClose} />

      <ConfirmModal
        open={deleteTargetId !== undefined}
        title="取引先の削除"
        message="この取引先を削除しますか?"
        confirmLabel="削除"
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
