import { Button } from '@/components/ui/Button/Button';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { EmptyState } from './EmptyState';

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;

export const WithAction: StoryObj<typeof meta> = {
  args: {
    message: '登録された機器がありません',
    action: <Button onClick={(): void => undefined}>機器を登録</Button>,
  },
};

export const MessageOnly: StoryObj<typeof meta> = {
  args: {
    message: '該当する項目がありません',
  },
};
