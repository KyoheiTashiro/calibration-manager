import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./Badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;

export const Default: StoryObj<typeof meta> = {
  args: {
    children: "バッジ",
  },
};

// なぜ: Badgeは形状（ピル型）のみを提供する汎用コンポーネントで色の意味を持たない
// （Badge.tsx参照）ため、className経由で任意の色を注入できることを示すストーリー。
export const ColorInjection: StoryObj<typeof meta> = {
  args: {
    className: "bg-green-100 text-green-800",
    children: "承認済み",
  },
};
