import { Button } from "@/components/ui/Button/Button";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Modal } from "./Modal";

const meta = {
  title: "UI/Modal",
  component: Modal,
} satisfies Meta<typeof Modal>;

export default meta;

export const WithFooter: StoryObj<typeof meta> = {
  args: {
    open: true,
    title: "機器情報の編集",
    // なぜ: 手動確認用ストーリーのためonCloseは何もしないダミー関数でよい。
    onClose: (): void => undefined,
    children: <p className="text-sm text-slate-700">モーダル本文のサンプルです。</p>,
    footer: (
      <>
        <Button variant="secondary">キャンセル</Button>
        <Button variant="primary">保存</Button>
      </>
    ),
  },
};

// なぜ: isDirty=trueの状態で×ボタン（aria-label="閉じる"）を手動クリックすると、
// 破棄確認オーバーレイが表示される挙動を確認するためのストーリー
// （自動化されたplay関数は使わず、Storybookキャンバス上での手動操作を想定する）。
export const DirtyWithDiscardConfirm: StoryObj<typeof meta> = {
  args: {
    open: true,
    title: "機器情報の編集",
    isDirty: true,
    onClose: (): void => undefined,
    children: <p className="text-sm text-slate-700">編集中の内容があります。</p>,
  },
};
