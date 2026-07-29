import type { Meta, StoryObj } from "@storybook/react-vite";

import { DateField } from "./DateField";

const meta = {
  title: "UI/DateField",
  component: DateField,
} satisfies Meta<typeof DateField>;

export default meta;

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: "次回期限",
  },
};

export const WithValue: StoryObj<typeof meta> = {
  args: {
    label: "次回期限",
    defaultValue: "2026-07-03",
  },
};

export const WithError: StoryObj<typeof meta> = {
  args: {
    label: "次回期限",
    error: "次回期限を入力してください",
  },
};

export const Disabled: StoryObj<typeof meta> = {
  args: {
    label: "次回期限",
    defaultValue: "2026-07-03",
    disabled: true,
  },
};
