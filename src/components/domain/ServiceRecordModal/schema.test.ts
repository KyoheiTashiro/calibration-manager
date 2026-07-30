import { Schema } from '@/components/domain/ServiceRecordModal/schema';
import { TEXT_LIMIT } from '@/constants/textLimits';
import { SERVICE_RECORD_RESULT } from '@/store/types';
import { maxLengthMessage } from '@/utils/form';
import { describe, expect, it } from 'vitest';

const validBase = {
  doneDate: '2026-01-01',
  doneBy: '担当',
  result: SERVICE_RECORD_RESULT.PASS,
  note: '',
};

describe('Schema: 文字数上限バリデーション', () => {
  it('doneByが50文字ちょうどなら通る', () => {
    const result = Schema.safeParse({ ...validBase, doneBy: 'あ'.repeat(TEXT_LIMIT.name) });

    expect(result.success).toBe(true);
  });

  it('doneByが51文字だとエラーになる', () => {
    const result = Schema.safeParse({ ...validBase, doneBy: 'あ'.repeat(TEXT_LIMIT.name + 1) });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(maxLengthMessage('実施者', TEXT_LIMIT.name));
    }
  });

  it('noteが500文字ちょうどなら通る', () => {
    const result = Schema.safeParse({ ...validBase, note: 'あ'.repeat(TEXT_LIMIT.note) });

    expect(result.success).toBe(true);
  });

  it('noteが501文字だとエラーになる', () => {
    const result = Schema.safeParse({ ...validBase, note: 'あ'.repeat(TEXT_LIMIT.note + 1) });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(maxLengthMessage('備考', TEXT_LIMIT.note));
    }
  });
});
