import { Button } from "@/components/ui/Button/Button";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { EmptyState } from "./EmptyState";

const meta = {
  title: "UI/EmptyState",
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;

// なぜ: アイコン用のSVGを直書きせず、シンプルな絵文字で代用する
// （本ストーリーはicon propに任意のReactNodeを渡せることを示す目的で十分なため）。
const SampleIcon = <span className="text-3xl">📦</span>;

export const WithIconAndAction: StoryObj<typeof meta> = {
  args: {
    icon: SampleIcon,
    message: "登録された機器がありません",
    action: <Button onClick={(): void => undefined}>機器を登録</Button>,
  },
};

export const WithoutIconAndAction: StoryObj<typeof meta> = {
  args: {
    message: "該当する項目がありません",
  },
};

export const IconOnly: StoryObj<typeof meta> = {
  args: {
    icon: SampleIcon,
    message: "検索結果がありません",
  },
};

export const ActionOnly: StoryObj<typeof meta> = {
  args: {
    message: "案件が登録されていません",
    action: <Button onClick={(): void => undefined}>案件を登録</Button>,
  },
};
