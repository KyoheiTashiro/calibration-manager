import { matchesSearchText } from '@/utils/search';
import { describe, expect, it } from 'vitest';

describe('matchesSearchText', () => {
  it('検索語が空なら常に一致する', () => {
    expect(matchesSearchText([undefined], '')).toBe(true);
  });

  it('いずれかのフィールドに大文字小文字を無視して部分一致すれば true', () => {
    expect(matchesSearchText(['EQ-001', undefined, 'Mitutoyo'], 'mitu')).toBe(true);
  });

  it('どのフィールドにも含まれなければ false（未設定フィールドは空文字扱い）', () => {
    expect(matchesSearchText(['EQ-001', undefined], 'undefined')).toBe(false);
  });
});
