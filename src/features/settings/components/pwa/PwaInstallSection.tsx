/**
 * 設定画面のPWAインストール案内セクション。
 * `beforeinstallprompt` / `appinstalled` の非標準イベントを購読し(src/types/beforeinstallprompt.d.ts 参照)、
 * インストール可否・インストール済みかで案内文/ボタンを出し分ける。
 */

import { Button } from "@/components/ui";
import { useEffect, useState, type ReactElement, type ReactNode } from "react";

export const PwaInstallSection = (): ReactElement => {
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
  const handleInstallClick = (): void => {
    if (deferred === null) {
      return;
    }
    const current = deferred;
    current
      .prompt()
      .then(() => current.userChoice)
      .then(() => {
        // なぜ: Chrome は同一イベントの再 prompt() を許さないため、結果に関わらず deferred を破棄する。
        setDeferred(null);
      })
      .catch(() => {
        // インストール操作の失敗は例外を投げず無視する(coding-standards §8)
        setDeferred(null);
      });
  };

  const renderStatus = (): ReactNode => {
    if (isInstalled) {
      return (
        <p className="text-sm text-slate-700">
          インストール済みです。ホーム画面またはアプリ一覧から起動できます。
        </p>
      );
    }
    if (deferred !== null) {
      return (
        <div>
          <Button variant="primary" onClick={handleInstallClick}>
            アプリとしてインストール
          </Button>
        </div>
      );
    }
    return (
      <p className="text-sm text-slate-700">
        このブラウザーでは自動インストールに対応していません。Chrome / Edge
        ではアドレスバーのインストールアイコンから、iOS の Safari
        では共有メニューの「ホーム画面に追加」からインストールできます。
      </p>
    );
  };

  return (
    <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">アプリのインストール</h2>
      <p className="text-sm text-slate-700">
        このアプリは PWA(プログレッシブ ウェブ
        アプリ)として端末にインストールでき、ホーム画面やデスクトップから単独のアプリとして起動できます。
      </p>
      {renderStatus()}
    </section>
  );
};
