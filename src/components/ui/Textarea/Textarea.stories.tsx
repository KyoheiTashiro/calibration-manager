import type { Meta, StoryObj } from "@storybook/react-vite";

import { Textarea } from "./Textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
} satisfies Meta<typeof Textarea>;

export default meta;

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: "備考",
    placeholder: "特記事項があればここに入力してください",
  },
};

export const WithError: StoryObj<typeof meta> = {
  args: {
    label: "検査内容",
    error: "検査内容を入力してください",
  },
};

export const Required: StoryObj<typeof meta> = {
  args: {
    label: "点検結果",
    required: true,
    placeholder: "点検結果の詳細を記入してください",
  },
};
