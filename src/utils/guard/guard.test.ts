import { isOneOf } from '@/utils/guard';
import { describe, expect, it } from 'vitest';

describe('isOneOf', () => {
  const values = ['active', 'retired'] as const;

  it('values に含まれる値は true', () => {
    expect(isOneOf('active', values)).toBe(true);
  });

  it('values に含まれない値は false', () => {
    expect(isOneOf('all', values)).toBe(false);
    expect(isOneOf('', values)).toBe(false);
  });
});
