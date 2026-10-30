/**
 * マニュアル内検索の状態遷移(純関数)。不変条件:
 * - matches が空 ⇔ currentIndex === -1
 * - matches が非空 ⇒ 0 <= currentIndex < matches.length
 * - MOVE は末尾→先頭 / 先頭→末尾へ循環する
 * query・matches・currentIndex を別 state で持つと 1 操作で 3 つ同時更新になり
 * 上記を破る中間状態が作れるため、1 つの state と reducer に集約する。
 */

export type SearchState = {
  query: string;
  matches: Range[];
  currentIndex: number;
};

export const SEARCH_ACTION = {
  /** 検索語の変更と、それに対する一致範囲の確定 */
  SET_RESULTS: 'setResults',
  /** 次(+1)/前(-1)の一致へ移動 */
  MOVE: 'move',
  CLEAR: 'clear',
} as const;

export type SearchAction =
  | { type: typeof SEARCH_ACTION.SET_RESULTS; query: string; matches: Range[] }
  | { type: typeof SEARCH_ACTION.MOVE; step: 1 | -1 }
  | { type: typeof SEARCH_ACTION.CLEAR };

export const INITIAL_SEARCH_STATE: SearchState = {
  query: '',
  matches: [],
  currentIndex: -1,
};

export const searchReducer = (state: SearchState, action: SearchAction): SearchState => {
  if (action.type === SEARCH_ACTION.SET_RESULTS) {
    return {
      query: action.query,
      matches: action.matches,
      currentIndex: action.matches.length > 0 ? 0 : -1,
    };
  }
  if (action.type === SEARCH_ACTION.MOVE) {
    const { length } = state.matches;
    if (length === 0) return state;
    return {
      ...state,
      currentIndex: (state.currentIndex + action.step + length) % length,
    };
  }
  return INITIAL_SEARCH_STATE;
};
