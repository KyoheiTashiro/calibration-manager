import type { Meta, StoryObj } from "@storybook/react-vite";

import { Select } from "./Select";

const SAMPLE_OPTIONS = [
  { value: "yearly", label: "年次" },
  { value: "quarterly", label: "四半期" },
  { value: "monthly", label: "月次" },
] as const;

const meta = {
  title: "UI/Select",
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: "校正周期",
    options: SAMPLE_OPTIONS,
  },
};

export const WithError: StoryObj<typeof meta> = {
  args: {
    label: "校正周期",
    options: SAMPLE_OPTIONS,
    error: "校正周期を選択してください",
  },
};

export const Required: StoryObj<typeof meta> = {
  args: {
    label: "校正周期",
    options: SAMPLE_OPTIONS,
    required: true,
  },
};

export const WithPlaceholder: StoryObj<typeof meta> = {
  args: {
    label: "校正周期",
    options: SAMPLE_OPTIONS,
    placeholder: "選択してください",
  },
};
