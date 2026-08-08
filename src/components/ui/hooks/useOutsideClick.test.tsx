import { useOutsideClick } from '@/components/ui/hooks/useOutsideClick';
import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

type Props = {
  onOutsideClick: () => void;
  enabled: boolean;
};

const Harness = ({ onOutsideClick, enabled }: Props): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, onOutsideClick, enabled);
  return (
    <div>
      <div ref={ref}>
        <button type='button'>内側</button>
      </div>
      <button type='button'>外側</button>
    </div>
  );
};

describe('useOutsideClick', () => {
  it('外側のpointerdownでハンドラが呼ばれること', () => {
    const handler = vi.fn<() => void>();
    render(<Harness onOutsideClick={handler} enabled />);

    fireEvent.pointerDown(screen.getByRole('button', { name: '外側' }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('内側のpointerdownではハンドラが呼ばれないこと', () => {
    const handler = vi.fn<() => void>();
    render(<Harness onOutsideClick={handler} enabled />);

    fireEvent.pointerDown(screen.getByRole('button', { name: '内側' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('enabled=falseでは外側クリックでも呼ばれないこと', () => {
    const handler = vi.fn<() => void>();
    render(<Harness onOutsideClick={handler} enabled={false} />);

    fireEvent.pointerDown(screen.getByRole('button', { name: '外側' }));

    expect(handler).not.toHaveBeenCalled();
  });
});
