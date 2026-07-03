import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactElement } from "react";

import { Tabs } from "./Tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;

const SAMPLE_TABS = [
  { key: "tab-one", label: "概要" },
  { key: "tab-two", label: "点検・校正項目" },
  { key: "tab-three", label: "履歴" },
] as const;

// なぜ: Tabsは制御コンポーネント（activeKey/onChangeを親から受け取る）のため、
// Storybook上で実際にクリック操作を確認できるようuseStateで選択状態を持つ
// デモ用ラッパーをストーリーファイル内に定義する。
const TabsDemo = (): ReactElement => {
  const [activeKey, setActiveKey] = useState("tab-one");

  return <Tabs tabs={SAMPLE_TABS} activeKey={activeKey} onChange={setActiveKey} />;
};

export const Default: StoryObj<typeof meta> = {
  // なぜargsが必要か: renderでTabsDemo（useStateラッパー）を描画するため個々のargsは使わないが、
  // StoryObjの型上componentが要求するargsを満たす必要があるため代表値を渡す。
  args: {
    tabs: SAMPLE_TABS,
    activeKey: "tab-one",
    onChange: (): void => undefined,
  },
  render: (): ReactElement => <TabsDemo />,
};
