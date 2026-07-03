import { INSPECTION_ITEM_STATUS } from "@/domain/inspectionItemStatus";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";

import { StatusBadge } from "./StatusBadge";

const meta = {
  title: "Domain/StatusBadge",
  component: StatusBadge,
} satisfies Meta<typeof StatusBadge>;

export default meta;

// なぜ: 5種類のステータスを1画面で見比べられるよう、
// INSPECTION_ITEM_STATUSの全値を並べて表示する単一ストーリーにする（文字列リテラルは直書きしない）。
export const AllStatuses: StoryObj<typeof meta> = {
  // なぜargsが必要か: renderで独自にステータス一覧を描画するため個々のargsは使わないが、
  // StoryObjの型上componentが要求するargsを満たす必要があるため代表値を渡す。
  args: {
    status: INSPECTION_ITEM_STATUS.OK,
  },
  render: (): ReactElement => (
    <div className="flex flex-wrap gap-2">
      {Object.values(INSPECTION_ITEM_STATUS).map((status) => (
        <StatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};
