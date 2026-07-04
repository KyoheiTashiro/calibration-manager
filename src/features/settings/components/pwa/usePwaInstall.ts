/**
 * PWA インストール導線用の状態(`beforeinstallprompt` / `appinstalled` の捕捉結果)を
 * モジュールスコープのストアで一元管理し、`useSyncExternalStore` で購読するフック。
 *
 * なぜコンポーネントの useEffect ではなくモジュールレベルで捕捉するか:
 * `beforeinstallprompt` はページロード直後に一度だけ発火する非標準イベントのため、
 * SPA 内遷移で設定画面を初めて表示した時点では既に発火済みで取り逃してしまう
 * （設定画面のマウントより先にイベントが発火するケースがあるため）。
 * そのため捕捉自体はアプリ起動時（main.tsx の setupPwaInstallCapture 呼び出し）に行い、
 * コンポーネントは保持済みの状態を購読するだけの薄いビューにする。
 */

import { useSyncExternalStore } from "react";

type PwaInstallState = {
  readonly deferredPrompt: BeforeInstallPromptEvent | null;
  readonly isInstalled: boolean;
};

// なぜ typeof ガードが必須か: jsdom は matchMedia 未実装のため、テスト環境で直接呼ぶと例外になる。
// standalone 表示中 = インストール済みアプリとして起動中、という判定。
const createInitialState = (): PwaInstallState => ({
  deferredPrompt: null,
  isInstalled:
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(display-mode: standalone)").matches,
});

let state: PwaInstallState = createInitialState();
const listeners = new Set<() => void>();
let isSetup = false;

const setState = (next: PwaInstallState): void => {
  // なぜ新しいオブジェクトで置換するか: useSyncExternalStore はスナップショットの参照比較で
  // 再レンダー要否を判定するため、参照を変えないと更新が伝わらない。
  state = next;
  for (const listener of listeners) {
    listener();
  }
};

/**
 * `beforeinstallprompt` / `appinstalled` の捕捉を開始する。アプリ起動時（main.tsx）に一度だけ呼ぶ。
 * `isSetup` フラグにより複数回呼ばれても登録が重複しない（冪等）。
 */
export const setupPwaInstallCapture = (): void => {
  if (isSetup) {
    return;
  }
  isSetup = true;

  globalThis.addEventListener("beforeinstallprompt", (event: BeforeInstallPromptEvent): void => {
    // なぜ: Chrome のミニ情報バー自動表示を抑止し、設定画面のボタンから任意タイミングで出すため。
    event.preventDefault();
    setState({ ...state, deferredPrompt: event });
  });

  globalThis.addEventListener("appinstalled", (): void => {
    setState({ deferredPrompt: null, isInstalled: true });
  });
};

/**
 * インストールプロンプト表示後（成功・失敗・キャンセル問わず）に呼び、保持していたイベントを破棄する。
 * なぜ: Chrome は同一イベントの再 prompt() を許さないため、結果に関わらず破棄する必要がある。
 */
export const clearDeferredPrompt = (): void => {
  setState({ ...state, deferredPrompt: null });
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): PwaInstallState => state;

/**
 * PWA インストール状態を購読するフック。捕捉自体は行わず、モジュールストアの現在値を返すだけ。
 */
export const usePwaInstall = (): PwaInstallState => useSyncExternalStore(subscribe, getSnapshot);

/** テスト用: ストアを初期状態に戻し全リスナーへ通知する。 */
export const resetPwaInstallStateForTest = (): void => {
  setState(createInitialState());
};
