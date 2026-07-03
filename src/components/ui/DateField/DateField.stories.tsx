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

export const WithError: StoryObj<typeof meta> = {
  args: {
    label: "次回期限",
    error: "次回期限を入力してください",
  },
};
