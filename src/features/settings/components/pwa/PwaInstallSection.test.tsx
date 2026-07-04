/**
 * 設定画面のPWAインストール案内セクション(usePwaInstall の状態を表示に反映するだけの薄いビュー)の結線検証。
 * beforeinstallprompt / appinstalled の非標準イベントを疑似発火し、案内文・ボタンの出し分けを確認する。
 */

import { PwaInstallSection } from "@/features/settings/components/pwa/PwaInstallSection";
import {
  resetPwaInstallStateForTest,
  setupPwaInstallCapture,
} from "@/features/settings/components/pwa/usePwaInstall";
import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMockEvent = (): BeforeInstallPromptEvent & { prompt: ReturnType<typeof vi.fn> } =>
  Object.assign(new Event("beforeinstallprompt"), {
    platforms: [],
    userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
    // oxlint-disable-next-line unicorn/no-useless-undefined -- mockResolvedValue は Promise<void> の解決値として引数必須
    prompt: vi.fn().mockResolvedValue(undefined),
  });

describe("PwaInstallSection", () => {
  beforeEach(() => {
    // なぜ: ストアはモジュールスコープで状態を保持するため、テスト間の汚染を防ぐためリセットしてから
    // 捕捉を再登録する(setupPwaInstallCapture は isSetup ガードで冪等なため毎回呼んでよい)。
    resetPwaInstallStateForTest();
    setupPwaInstallCapture();
  });

  it("初期状態では非対応案内文を表示し、インストールボタンは存在しない", () => {
    render(<PwaInstallSection />);

    expect(
      screen.getByText(/このブラウザーでは自動インストールに対応していません/u),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "アプリとしてインストール" }),
    ).not.toBeInTheDocument();
  });

  it("beforeinstallprompt 発火後はインストールボタンを表示し、クリックで prompt が呼ばれ非対応案内文に戻る", async () => {
    render(<PwaInstallSection />);
    const mockEvent = createMockEvent();

    act(() => {
      globalThis.dispatchEvent(mockEvent);
    });

    const installButton = await screen.findByRole("button", {
      name: "アプリとしてインストール",
    });

    await userEvent.click(installButton);

    expect(mockEvent.prompt).toHaveBeenCalled();
    expect(
      await screen.findByText(/このブラウザーでは自動インストールに対応していません/u),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "アプリとしてインストール" }),
    ).not.toBeInTheDocument();
  });

  it("appinstalled 発火後はインストール済み文言を表示し、ボタンは表示されない", () => {
    render(<PwaInstallSection />);

    act(() => {
      globalThis.dispatchEvent(new Event("appinstalled"));
    });

    expect(screen.getByText(/インストール済みです/u)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "アプリとしてインストール" }),
    ).not.toBeInTheDocument();
  });

  it("beforeinstallprompt 発火時に event.preventDefault が呼ばれる", () => {
    render(<PwaInstallSection />);
    const mockEvent = createMockEvent();
    const preventDefaultSpy = vi.spyOn(mockEvent, "preventDefault");

    act(() => {
      globalThis.dispatchEvent(mockEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("コンポーネントマウント前に beforeinstallprompt が発火してもインストールボタンを表示する（回帰）", () => {
    const mockEvent = createMockEvent();

    // なぜ render の前に発火させるか: setupPwaInstallCapture はモジュールスコープで捕捉するため、
    // 設定画面がまだマウントされていなくても状態は保持され、後からマウントされたビューに反映されるはず
    // （SPA 内遷移で設定画面を初めて表示した時には既にイベント発火済み、という実際のバグ状況を再現）。
    act(() => {
      globalThis.dispatchEvent(mockEvent);
    });

    render(<PwaInstallSection />);

    expect(screen.getByRole("button", { name: "アプリとしてインストール" })).toBeInTheDocument();
  });
});
