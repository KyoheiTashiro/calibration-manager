import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";

import { Button } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;

const VARIANTS = ["primary", "secondary", "danger"] as const;
const SIZES = ["md", "sm"] as const;

// なぜ: variant × size の全6通りを一覧できるグリッド表示にすることで、
// 個別ストーリーを6つ用意するより一目で比較できるようにする。
export const AllCombinations: StoryObj<typeof meta> = {
  // なぜargsが必要か: renderで独自にvariant×sizeの一覧を描画するため個々のargsは使わないが、
  // StoryObjの型上componentが要求するargsを満たす必要があるため代表値を渡す。
  args: {
    children: "ボタン",
  },
  render: (): ReactElement => (
    <div className="flex flex-col gap-4">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex items-center gap-4">
          {SIZES.map((size) => (
            <Button key={size} variant={variant} size={size}>
              {variant} / {size}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Disabled: StoryObj<typeof meta> = {
  args: {
    variant: "primary",
    size: "md",
    disabled: true,
    children: "無効化ボタン",
  },
};
