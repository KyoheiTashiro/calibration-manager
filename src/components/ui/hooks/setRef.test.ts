import { setRef } from '@/components/ui/hooks/setRef';
import { describe, expect, it, vi } from 'vitest';

describe('setRef', () => {
  it('callback ref に node が渡ること', () => {
    const callback = vi.fn<(node: HTMLDivElement | null) => void>();
    const node = document.createElement('div');

    setRef(callback, node);

    expect(callback).toHaveBeenCalledWith(node);
  });

  it('object ref の .current に node が入ること', () => {
    const objectRef = { current: null as HTMLDivElement | null };
    const node = document.createElement('div');

    setRef(objectRef, node);

    expect(objectRef.current).toBe(node);
  });

  it('undefined を渡しても例外にならないこと', () => {
    expect(() => {
      setRef(undefined, document.createElement('div'));
    }).not.toThrow();
  });
});
