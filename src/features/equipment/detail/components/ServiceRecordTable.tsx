import { EmptyState, Table, TableBody, TableHead, Td, Th } from "@/components/ui";
import type { ServiceRecordRow } from "@/features/equipment/detail/hooks";
import { SERVICE_RECORD_RESULT_LABELS } from "@/features/serviceItems/constants";
import type { ReactElement } from "react";

type Props = {
  serviceRecordRows: readonly ServiceRecordRow[];
};

export const ServiceRecordTable = ({ serviceRecordRows }: Props): ReactElement =>
  serviceRecordRows.length === 0 ? (
    <EmptyState message="実施記録が未登録です" />
  ) : (
    <Table>
      <TableHead>
        <tr>
          <Th>実施日</Th>
          <Th>項目名</Th>
          <Th>実施者</Th>
          <Th>結果</Th>
          <Th>備考</Th>
        </tr>
      </TableHead>
      <TableBody>
        {serviceRecordRows.map(({ serviceRecord, serviceItemName }) => (
          <tr key={serviceRecord.id}>
            <Td>{serviceRecord.doneDate}</Td>
            <Td>{serviceItemName}</Td>
            <Td>{serviceRecord.doneBy}</Td>
            <Td>{SERVICE_RECORD_RESULT_LABELS[serviceRecord.result]}</Td>
            <Td>{serviceRecord.note ?? "—"}</Td>
          </tr>
        ))}
      </TableBody>
    </Table>
  );
