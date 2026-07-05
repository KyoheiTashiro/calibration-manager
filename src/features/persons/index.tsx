import { PersonModal } from "@/components/domain/PersonModal";
import { Badge, Button, EmptyState, Table, TableBody, TableHead } from "@/components/ui";
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
              <th scope="col" className="px-3 py-2 text-left">
                氏名
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                部署
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                メール
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                状態
              </th>
              <th scope="col" className="px-3 py-2 text-left">
                操作
              </th>
            </tr>
          </TableHead>
          <TableBody>
            {sortedPersons.map((person) => (
              <tr key={person.id}>
                <td className="px-3 py-2">{person.name}</td>
                <td className="px-3 py-2">{person.department ?? "—"}</td>
                <td className="px-3 py-2">{person.email}</td>
                <td className="px-3 py-2">
                  <Badge
                    className={
                      person.isActive ? ACTIVE_BADGE_CLASS_NAME : INACTIVE_BADGE_CLASS_NAME
                    }
                  >
                    {person.isActive ? "有効" : "無効"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      handleEditClick(person);
                    }}
                  >
                    編集
                  </Button>
                </td>
              </tr>
            ))}
          </TableBody>
        </Table>
      )}

      <PersonModal open={modalState.open} person={modalState.entity} onClose={handleModalClose} />
    </div>
  );
};
