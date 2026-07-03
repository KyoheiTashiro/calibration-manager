import type { Meta, StoryObj } from "@storybook/react-vite";

import { ConfirmModal } from "./ConfirmModal";

const meta = {
  title: "UI/ConfirmModal",
  component: ConfirmModal,
} satisfies Meta<typeof ConfirmModal>;

export default meta;

export const Danger: StoryObj<typeof meta> = {
  args: {
    open: true,
    title: "機器を削除しますか?",
    message: "この操作は取り消せません。",
    confirmLabel: "削除",
    danger: true,
    // なぜ: 手動確認用ストーリーのためonConfirm/onCancelは何もしないダミー関数でよい。
    onConfirm: (): void => undefined,
    onCancel: (): void => undefined,
  },
};

export const NotDanger: StoryObj<typeof meta> = {
  args: {
    open: true,
    title: "変更を保存しますか?",
    message: "保存すると一覧に反映されます。",
    confirmLabel: "保存",
    danger: false,
    onConfirm: (): void => undefined,
    onCancel: (): void => undefined,
  },
};
