import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextField } from "./TextField";

const meta = {
  title: "UI/TextField",
  component: TextField,
} satisfies Meta<typeof TextField>;

export default meta;

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: "管理番号",
    placeholder: "例: EQ-001",
  },
};

export const WithError: StoryObj<typeof meta> = {
  args: {
    label: "管理番号",
    error: "管理番号を入力してください",
  },
};

export const Required: StoryObj<typeof meta> = {
  args: {
    label: "型番",
    required: true,
    placeholder: "例: MODEL-2024",
  },
};
