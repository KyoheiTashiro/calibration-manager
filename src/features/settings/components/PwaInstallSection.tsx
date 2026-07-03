/**
 * 設定画面のPWAインストール案内セクション(usePwaInstall の状態を表示に反映するだけの薄いビュー)。
 * インストール可否・インストール済みかで案内文/ボタンを出し分ける。
 */

import { Button } from "@/components/ui";
import { usePwaInstall } from "@/features/settings/usePwaInstall";
import type { ReactElement, ReactNode } from "react";

export const PwaInstallSection = (): ReactElement => {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();

  const handleInstallClick = (): void => {
    promptInstall().catch(() => {
      // インストール操作の失敗は例外を投げず無視する(coding-standards §8)
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
    if (canInstall) {
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
        このブラウザでは自動インストールに対応していません。Chrome / Edge
        ではアドレスバーのインストールアイコンから、iOS の Safari
        では共有メニューの「ホーム画面に追加」からインストールできます。
      </p>
    );
  };

  return (
    <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">アプリのインストール</h2>
      <p className="text-sm text-slate-700">
        このアプリは
        PWA(プログレッシブウェブアプリ)として端末にインストールでき、ホーム画面やデスクトップから単独のアプリとして起動できます。
      </p>
      {renderStatus()}
    </section>
  );
};
