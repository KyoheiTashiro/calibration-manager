import type { Meta, StoryObj } from "@storybook/react-vite";

import { RadioGroup } from "./RadioGroup";

const SAMPLE_OPTIONS = [
  { value: "inspection", label: "検査" },
  { value: "calibration", label: "校正" },
  { value: "maintenance", label: "保守" },
] as const;

const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
} satisfies Meta<typeof RadioGroup>;

export default meta;

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: "点検種別",
    options: SAMPLE_OPTIONS,
  },
};

export const WithError: StoryObj<typeof meta> = {
  args: {
    label: "点検種別",
    options: SAMPLE_OPTIONS,
    error: "点検種別を選択してください",
  },
};

export const Required: StoryObj<typeof meta> = {
  args: {
    label: "点検種別",
    options: SAMPLE_OPTIONS,
    required: true,
  },
};
