/** 一覧ページネーション（screen-design/README.md §0.8 D-076）の適用確認 */

import { PersonList } from '@/features/persons';
import type { Person } from '@/store/types';
import { renderWithStore, seedStore, setupStoreIsolation } from '@/test/renderWithStore';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';

const PERSON_SEED_COUNT = 25;

const buildPersons = (count: number): Record<string, Person> => {
  const persons: Record<string, Person> = {};
  for (let index = 0; index < count; index += 1) {
    const id = `person-${String(index).padStart(2, '0')}`;
    persons[id] = {
      id,
      name: `担当者${String(index).padStart(2, '0')}`,
      email: `person${String(index).padStart(2, '0')}@example.com`,
      isActive: true,
    };
  }
  return persons;
};

beforeEach(setupStoreIsolation);

describe('PersonList: ページネーション', () => {
  it('21件以上あるとき1ページ目には20件のみ表示され、ページネーションが表示される', () => {
    seedStore({ persons: buildPersons(PERSON_SEED_COUNT) });
    renderWithStore(<PersonList />);

    expect(screen.getAllByRole('row')).toHaveLength(21); // ヘッダー行 + データ20行
    expect(screen.getByRole('navigation', { name: 'ページネーション' })).toBeInTheDocument();
    expect(screen.getByText(`全${PERSON_SEED_COUNT}件中 1–20件目`)).toBeInTheDocument();
  });

  it('次へ押下でページが切り替わり表示行が変わる', async () => {
    const user = userEvent.setup();
    seedStore({ persons: buildPersons(PERSON_SEED_COUNT) });
    renderWithStore(<PersonList />);

    expect(screen.queryByText('担当者24')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '次へ' }));

    expect(screen.getByText('担当者24')).toBeInTheDocument();
    expect(screen.getByText(`全${PERSON_SEED_COUNT}件中 21–25件目`)).toBeInTheDocument();
  });
});
