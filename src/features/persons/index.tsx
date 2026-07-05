import { PersonModal } from "@/components/domain/PersonModal";
import { Badge, Button, EmptyState, Table, TableBody, TableHead, Td, Th } from "@/components/ui";
import { usePersonList } from "@/features/persons/hooks";
import type { Person } from "@/store/types";
import { useEntityModal } from "@/utils/modal";
import type { ReactElement } from "react";

/** 状態バッジの色classNameマッピング（screen-design/09-masters.md §9-B、StatusBadgeと同じ配色パターン） */
const ACTIVE_BADGE_CLASS_NAME = "bg-green-100 text-green-800";
const INACTIVE_BADGE_CLASS_NAME = "bg-slate-100 text-slate-600";

/**
 * 担当者マスタ画面（screen-design/09-masters.md §9-B）。
 * 物理削除は行わず、モーダル内の「有効」チェックボックストグルで無効化する。
 */
export const PersonList = (): ReactElement => {
  const sortedPersons = usePersonList();
  const { modalState, handleAddClick, handleEditClick, handleModalClose } =
    useEntityModal<Person>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">担当者</h1>
        <Button onClick={handleAddClick}>+ 追加</Button>
      </div>

      {sortedPersons.length === 0 ? (
        <EmptyState
          message="担当者が未登録です"
          action={<Button onClick={handleAddClick}>+ 追加</Button>}
        />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <Th>氏名</Th>
              <Th>部署</Th>
              <Th>メール</Th>
              <Th>状態</Th>
              <Th>操作</Th>
            </tr>
          </TableHead>
          <TableBody>
            {sortedPersons.map((person) => (
              <tr key={person.id}>
                <Td>{person.name}</Td>
                <Td>{person.department ?? "—"}</Td>
                <Td>{person.email}</Td>
                <Td>
                  <Badge
                    className={
                      person.isActive ? ACTIVE_BADGE_CLASS_NAME : INACTIVE_BADGE_CLASS_NAME
                    }
                  >
                    {person.isActive ? "有効" : "無効"}
                  </Badge>
                </Td>
                <Td>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      handleEditClick(person);
                    }}
                  >
                    編集
                  </Button>
                </Td>
              </tr>
            ))}
          </TableBody>
        </Table>
      )}

      <PersonModal open={modalState.open} person={modalState.entity} onClose={handleModalClose} />
    </div>
  );
};
