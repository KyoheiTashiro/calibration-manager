/**
 * 設定画面のPWAインストール案内セクション(usePwaInstall の状態を表示に反映するだけの薄いビュー)の結線検証。
 * beforeinstallprompt / appinstalled の非標準イベントを疑似発火し、案内文・ボタンの出し分けを確認する。
 */

import { PwaInstallSection } from "@/features/settings/components/PwaInstallSection";
import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const createMockEvent = (): BeforeInstallPromptEvent & { prompt: ReturnType<typeof vi.fn> } =>
  Object.assign(new Event("beforeinstallprompt"), {
    platforms: [],
    userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
    // oxlint-disable-next-line unicorn/no-useless-undefined -- mockResolvedValue は Promise<void> の解決値として引数必須
    prompt: vi.fn().mockResolvedValue(undefined),
  });

describe("PwaInstallSection", () => {
  it("初期状態では非対応案内文を表示し、インストールボタンは存在しない", () => {
    render(<PwaInstallSection />);

    expect(
      screen.getByText(/このブラウザでは自動インストールに対応していません/u),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "アプリとしてインストール" }),
    ).not.toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
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
      await screen.findByText(/このブラウザでは自動インストールに対応していません/u),
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
});
