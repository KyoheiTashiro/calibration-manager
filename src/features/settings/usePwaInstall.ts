/**
 * PWA インストールプロンプトの捕捉・表示・インストール済み判定をまとめるフック。
 * `beforeinstallprompt` / `appinstalled` の非標準イベントを購読する(src/types/beforeinstallprompt.d.ts 参照)。
 */

import { useEffect, useState } from "react";

type UsePwaInstallResult = {
  /** beforeinstallprompt を捕捉済みでインストールプロンプトを出せる状態 */
  canInstall: boolean;
  /** すでにアプリとしてインストール済み(standalone 起動 or appinstalled 発火) */
  isInstalled: boolean;
  /** 捕捉済みプロンプトを表示する。未捕捉時は何もしない */
  promptInstall: () => Promise<void>;
};

export const usePwaInstall = (): UsePwaInstallResult => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // なぜ: jsdom は matchMedia 未実装のためガード必須。standalone 表示中 = インストール済みアプリとして起動中、という判定。
  const [isInstalled, setIsInstalled] = useState<boolean>(
    () =>
      typeof globalThis.matchMedia === "function" &&
      globalThis.matchMedia("(display-mode: standalone)").matches,
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent): void => {
      // なぜ: Chrome のミニ情報バー自動表示を抑止し、設定画面のボタンから任意タイミングで出すため。
      event.preventDefault();
      setDeferred(event);
    };

    const handleAppInstalled = (): void => {
      setIsInstalled(true);
      setDeferred(null);
    };

    globalThis.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    globalThis.addEventListener("appinstalled", handleAppInstalled);

    return (): void => {
      globalThis.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      globalThis.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // なぜ .then か: oxc(no-async-await) 方針のため async/await ではなく Promise チェーンで扱う。
  const promptInstall = (): Promise<void> => {
    if (deferred === null) {
      return Promise.resolve();
    }
    const current = deferred;
    return current
      .prompt()
      .then(() => current.userChoice)
      .then(() => {
        // なぜ: Chrome は同一イベントの再 prompt() を許さないため、結果に関わらず deferred を破棄する。
        setDeferred(null);
      });
  };

  return {
    canInstall: deferred !== null,
    isInstalled,
    promptInstall,
  };
};
