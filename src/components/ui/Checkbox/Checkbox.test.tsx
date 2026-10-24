import { Checkbox } from '@/components/ui/Checkbox';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する。
import '@testing-library/jest-dom/vitest';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

describe('Checkbox', () => {
  it('label が表示され type=checkbox としてレンダリングされる', () => {
    render(<Checkbox label='メーカー' />);

    expect(screen.getByRole('checkbox', { name: 'メーカー' })).toBeInTheDocument();
  });

  it('ラベルクリックでチェック状態が切り替わり onChange が呼ばれる', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<() => void>();
    render(<Checkbox label='校正業者' onChange={handleChange} />);

    await user.click(screen.getByText('校正業者'));

    expect(handleChange).toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: '校正業者' })).toBeChecked();
  });

  it('name/ref 等のネイティブ props がそのまま素通しされる', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox label='メーカー' name='isManufacturer' ref={ref} />);

    const checkbox = screen.getByRole('checkbox', { name: 'メーカー' });
    expect(checkbox).toHaveAttribute('name', 'isManufacturer');
    expect(ref.current).toBe(checkbox);
  });
});
