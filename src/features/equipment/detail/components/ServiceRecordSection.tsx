import { Pagination, usePagination } from "@/components/ui";
import { ServiceRecordTable } from "@/features/equipment/detail/components/ServiceRecordTable";
import type { ServiceRecordRow } from "@/features/equipment/detail/hooks";
import type { ReactElement } from "react";

type Props = {
  serviceRecordRows: readonly ServiceRecordRow[];
};

/**
 * 実施記録テーブルにページネーションを適用するラッパー(screen-design/README.md
 * §0.8 D-076、04-equipment-detail.md D-078: 点検校正項目テーブルとページ状態を独立させる)。
 * ServiceItemSection と同じ理由(hooksルール違反回避)で専用コンポーネントに切り出す。
 */
export const ServiceRecordSection = ({ serviceRecordRows }: Props): ReactElement => {
  const { page, pageSize, totalCount, pagedItems, setPage, setPageSize } =
    usePagination(serviceRecordRows);

  return (
    <>
      <ServiceRecordTable serviceRecordRows={pagedItems} />
      {totalCount > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </>
  );
};
