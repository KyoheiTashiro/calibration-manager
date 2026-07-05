import type { Meta, StoryObj } from "@storybook/react-vite";

import { ConfirmModal } from "./ConfirmModal";

const meta = {
  title: "UI/ConfirmModal",
  component: ConfirmModal,
} satisfies Meta<typeof ConfirmModal>;

export default meta;

export const Default: StoryObj<typeof meta> = {
  args: {
    open: true,
    title: "機器を削除しますか?",
    message: "この操作は取り消せません。",
    confirmLabel: "削除",
    // なぜ: 手動確認用ストーリーのためonConfirm/onCancelは何もしないダミー関数でよい。
    onConfirm: (): void => undefined,
    onCancel: (): void => undefined,
  },
};
