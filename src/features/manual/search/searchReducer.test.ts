import { describe, expect, it } from 'vitest';

import {
  INITIAL_SEARCH_STATE,
  SEARCH_ACTION,
  searchReducer,
  type SearchState,
} from './searchReducer';

/* reducer は Range の中身を見ないため、jsdom の空 Range で代用する */
const ranges = (count: number): Range[] =>
  Array.from({ length: count }, () => document.createRange());

const withMatches = (count: number, currentIndex: number): SearchState => ({
  query: 'q',
  matches: ranges(count),
  currentIndex,
});

describe('searchReducer', () => {
  describe('SET_RESULTS', () => {
    it('一致ありなら先頭(0)を現在位置にする', () => {
      const matches = ranges(3);
      const next = searchReducer(INITIAL_SEARCH_STATE, {
        type: SEARCH_ACTION.SET_RESULTS,
        query: 'abc',
        matches,
      });
      expect(next).toEqual({ query: 'abc', matches, currentIndex: 0 });
    });

    it('一致なしなら currentIndex は -1', () => {
      const next = searchReducer(withMatches(3, 2), {
        type: SEARCH_ACTION.SET_RESULTS,
        query: 'zzz',
        matches: [],
      });
      expect(next).toEqual({ query: 'zzz', matches: [], currentIndex: -1 });
    });
  });

  describe('MOVE', () => {
    it('一致なしでは state を変えない(同一参照)', () => {
      expect(
        searchReducer(INITIAL_SEARCH_STATE, {
          type: SEARCH_ACTION.MOVE,
          step: 1,
        }),
      ).toBe(INITIAL_SEARCH_STATE);
    });

    it('1件のみでは +1 / -1 ともに 0 のまま', () => {
      const state = withMatches(1, 0);
      expect(searchReducer(state, { type: SEARCH_ACTION.MOVE, step: 1 }).currentIndex).toBe(0);
      expect(searchReducer(state, { type: SEARCH_ACTION.MOVE, step: -1 }).currentIndex).toBe(0);
    });

    it('+1 で次へ進み、末尾からは先頭へ循環する', () => {
      expect(
        searchReducer(withMatches(3, 0), { type: SEARCH_ACTION.MOVE, step: 1 }).currentIndex,
      ).toBe(1);
      expect(
        searchReducer(withMatches(3, 2), { type: SEARCH_ACTION.MOVE, step: 1 }).currentIndex,
      ).toBe(0);
    });

    it('-1 で前へ戻り、先頭からは末尾へ循環する', () => {
      expect(
        searchReducer(withMatches(3, 2), { type: SEARCH_ACTION.MOVE, step: -1 }).currentIndex,
      ).toBe(1);
      expect(
        searchReducer(withMatches(3, 0), { type: SEARCH_ACTION.MOVE, step: -1 }).currentIndex,
      ).toBe(2);
    });

    it('query と matches は変えない', () => {
      const state = withMatches(2, 0);
      const next = searchReducer(state, { type: SEARCH_ACTION.MOVE, step: 1 });
      expect(next.query).toBe(state.query);
      expect(next.matches).toBe(state.matches);
    });
  });

  it('CLEAR で初期状態に戻る', () => {
    expect(searchReducer(withMatches(3, 1), { type: SEARCH_ACTION.CLEAR })).toEqual(
      INITIAL_SEARCH_STATE,
    );
  });
});
