import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "./Checkbox";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;

export default meta;

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: "校正済み",
  },
};

export const WithError: StoryObj<typeof meta> = {
  args: {
    label: "校正済み",
    error: "校正済みの確認が必要です",
  },
};

export const Required: StoryObj<typeof meta> = {
  args: {
    label: "検査済み",
    required: true,
  },
};
