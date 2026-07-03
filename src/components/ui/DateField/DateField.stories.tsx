import type { Meta, StoryObj } from "@storybook/react-vite";

import { DateField } from "./DateField";

const meta = {
  title: "UI/DateField",
  component: DateField,
} satisfies Meta<typeof DateField>;

export default meta;

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: "次回校正日",
  },
};

export const WithError: StoryObj<typeof meta> = {
  args: {
    label: "次回校正日",
    error: "次回校正日を入力してください",
  },
};
