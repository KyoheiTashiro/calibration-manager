/**
 * マスタ系スライス（vendor / person / equipment / serviceItem 等）の add / update が
 * 逐語重複していたため集約した汎用ヘルパ。Immer ドラフト上で破壊的に変更する。
 */

import type { AppSliceCreator, StoreState } from '@/store/storeState';
import { createId } from '@/utils/id';
import { recordValue } from '@/utils/record';
import type { Draft } from 'immer';

type SliceSet = Parameters<AppSliceCreator<unknown>>[0];
type SelectRecord<Entity> = (state: Draft<StoreState>) => Record<string, Entity>;

/** 新規idを払い出して input を格納する。@returns 生成したid */
export const addEntity = <Input extends object>(
  set: SliceSet,
  selectRecord: SelectRecord<Input & { id: string }>,
  input: Input,
): string => {
  const id = createId();
  set((state) => {
    selectRecord(state)[id] = { ...input, id };
  });
  return id;
};

/** 指定idのエンティティへ patch を部分適用する。存在しないidは no-op */
export const patchEntity = <Entity extends object>(
  set: SliceSet,
  selectRecord: SelectRecord<Entity>,
  id: string,
  patch: Partial<Entity>,
): void => {
  set((state) => {
    const entry = recordValue(selectRecord(state), id);
    if (entry === undefined) return;
    Object.assign(entry, patch);
  });
};
