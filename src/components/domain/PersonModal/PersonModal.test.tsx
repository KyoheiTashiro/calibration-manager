import { PersonModal } from '@/components/domain/PersonModal';
import type { Person } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { renderWithStore, seedStore, setupStoreIsolation } from '@/test/renderWithStore';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'person-1',
  name: '田中太郎',
  email: 'tanaka@example.com',
  department: '品質保証部',
  isActive: true,
  ...overrides,
});

describe('PersonModal', () => {
  beforeEach(setupStoreIsolation);

  it('担当者を無効化しようとすると確認文が表示され、確定でisActiveがfalseになりモーダルが閉じる', async () => {
    const user = userEvent.setup();
    const person = buildPerson({ id: 'person-1', isActive: true });
    seedStore({
      persons: { 'person-1': person },
      serviceItems: {},
    });
    const onClose = vi.fn<() => void>();

    renderWithStore(<PersonModal open person={person} onClose={onClose} />);

    await user.click(screen.getByLabelText('有効'));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('この担当者を無効化しますか?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '無効化' }));

    expect(useAppStore.getState().persons['person-1']?.isActive).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('無効化確認をキャンセルすると保存されず、ストアのisActiveは変化しない', async () => {
    const user = userEvent.setup();
    const person = buildPerson({ id: 'person-1', isActive: true });
    seedStore({
      persons: { 'person-1': person },
      serviceItems: {},
    });
    const onClose = vi.fn<() => void>();

    renderWithStore(<PersonModal open person={person} onClose={onClose} />);

    await user.click(screen.getByLabelText('有効'));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('この担当者を無効化しますか?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(screen.queryByText('この担当者を無効化しますか?')).not.toBeInTheDocument();
    expect(useAppStore.getState().persons['person-1']?.isActive).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('氏名・メールのバリデーションエラーが表示され、エラー時も保存ボタンは無効化されない', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();

    renderWithStore(<PersonModal open onClose={onClose} />);

    const saveButton = screen.getByRole('button', { name: '保存' });
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    expect(await screen.findByText('氏名は必須です')).toBeInTheDocument();
    expect(screen.getByText('メールアドレスは必須です')).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();

    // なぜ exact: false か: 必須フィールドはTextFieldのrequired表示（"*"付きラベル）により
    // ラベルの実テキストが「氏名*」等になるため、完全一致だと取得できない。
    await user.type(screen.getByLabelText('氏名', { exact: false }), '山田花子');
    await user.type(screen.getByLabelText('メール', { exact: false }), 'invalid');
    await user.click(saveButton);

    expect(await screen.findByText('メールアドレスの形式が不正です')).toBeInTheDocument();
    expect(screen.queryByText('氏名は必須です')).not.toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
