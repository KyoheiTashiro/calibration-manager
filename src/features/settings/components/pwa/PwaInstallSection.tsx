/**
 * イベント捕捉は main.tsx の setupPwaInstallCapture が起動時に行う(コンポーネントマウント前の発火を取り逃さないため)。
 */

import { Button } from "@/components/ui";
import {
  clearDeferredPrompt,
  usePwaInstall,
} from "@/features/settings/components/pwa/usePwaInstall";
import type { ReactElement, ReactNode } from "react";

export const PwaInstallSection = (): ReactElement => {
  const { deferredPrompt, isInstalled } = usePwaInstall();

  const handleInstallClick = async (): Promise<void> => {
    if (deferredPrompt === null) {
      return;
    }
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // インストール操作の失敗は無視する
    } finally {
      // なぜ: Chrome は同一イベントの再 prompt() を許さないため、結果に関わらず deferred を破棄する。
      clearDeferredPrompt();
    }
  };

  const renderStatus = (): ReactNode => {
    if (isInstalled) {
      return (
        <p className="text-sm text-slate-700">
          インストール済みです。ホーム画面またはアプリ一覧から起動できます。
        </p>
      );
    }
    if (deferredPrompt !== null) {
      return (
        <div>
          <Button
            variant="primary"
            onClick={() => {
              void handleInstallClick();
            }}
          >
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
