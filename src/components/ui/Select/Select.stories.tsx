import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ComponentProps, type ReactElement } from "react";

import { Select } from "./Select";

const SAMPLE_OPTIONS = [
  { value: "yearly", label: "年次" },
  { value: "quarterly", label: "四半期" },
  { value: "monthly", label: "月次" },
] as const;

// なぜ: Select は value/onChange 必須の制御コンポーネントのため、Storybook 上でも
// 実際の開閉・選択操作を確認できるよう render 用に最小限の state を持つラッパーを用意する。
const ControlledSelect = (args: ComponentProps<typeof Select>): ReactElement => {
  const [value, setValue] = useState(args.value);
  return <Select {...args} value={value} onChange={setValue} />;
};

// なぜ: args.onChange は ControlledSelect が実際には使わず setValue に差し替えるが、
// Props.onChange が必須のため story の args を満たす placeholder として用意する。
const noop = (): void => {
  // no-op
};

const meta = {
  title: "UI/Select",
  component: Select,
  render: ControlledSelect,
} satisfies Meta<typeof Select>;

export default meta;

export const Normal: StoryObj<typeof meta> = {
  args: {
    label: "周期",
    options: SAMPLE_OPTIONS,
    value: "monthly",
    onChange: noop,
  },
};

export const WithError: StoryObj<typeof meta> = {
  args: {
    label: "周期",
    options: SAMPLE_OPTIONS,
    value: "",
    onChange: noop,
    error: "周期を選択してください",
  },
};

export const Required: StoryObj<typeof meta> = {
  args: {
    label: "周期",
    options: SAMPLE_OPTIONS,
    value: "",
    onChange: noop,
    required: true,
  },
};

export const WithPlaceholder: StoryObj<typeof meta> = {
  args: {
    label: "周期",
    options: SAMPLE_OPTIONS,
    value: "",
    onChange: noop,
    placeholder: "選択してください",
  },
};

export const Disabled: StoryObj<typeof meta> = {
  args: {
    label: "周期",
    options: SAMPLE_OPTIONS,
    value: "monthly",
    onChange: noop,
    disabled: true,
  },
};

export const HiddenLabel: StoryObj<typeof meta> = {
  args: {
    label: "周期",
    labelHidden: true,
    options: SAMPLE_OPTIONS,
    value: "monthly",
    onChange: noop,
  },
};
