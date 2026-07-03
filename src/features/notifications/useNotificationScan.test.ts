/**
 * useNotificationScan（D-025）の検証。
 * (a) マウント時1回スキャン (b) 同日はインターバル発火してもスキャンしない
 * (c) 日付変更でインターバルスキャン (d) visibilitychange 可視復帰+日付変更でスキャン
 * (e) アンマウント後は発火しない、を fake timers + setSystemTime で確認する。
 */

import { useNotificationScan } from "@/features/notifications/useNotificationScan";
import { useAppStore } from "@/store/useAppStore";
import { setupStoreIsolation } from "@/test/renderWithStore";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SCAN_INTERVAL_MS = 60_000;

// setSystemTime に渡す「その日の 10:00（ローカル）」。todayIsoDate はローカル時刻で日付を出す。
const localNoon = (isoDate: string): Date => new Date(`${isoDate}T10:00:00`);

// generateNotifications を spy する。実処理は空ストアでは早期 return の無害な no-op のため
// 差し替えずに呼び出し回数・引数のみを検証する。
const spyGenerate = (): ReturnType<typeof vi.spyOn> =>
  vi.spyOn(useAppStore.getState(), "generateNotifications");

describe("useNotificationScan", () => {
  beforeEach(() => {
    setupStoreIsolation();
    vi.useFakeTimers();
    vi.setSystemTime(localNoon("2026-07-03"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("マウント時に今日の日付で1回スキャンする", () => {
    const generateSpy = spyGenerate();
    renderHook(() => useNotificationScan());

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(generateSpy).toHaveBeenCalledWith("2026-07-03");
  });

  it("同日内はインターバルが発火してもスキャンしない", () => {
    const generateSpy = spyGenerate();
    renderHook(() => useNotificationScan());
    generateSpy.mockClear();

    vi.advanceTimersByTime(SCAN_INTERVAL_MS * 3);

    expect(generateSpy).not.toHaveBeenCalled();
  });

  it("日付が変わるとインターバルで新しい日付でスキャンする", () => {
    const generateSpy = spyGenerate();
    renderHook(() => useNotificationScan());
    generateSpy.mockClear();

    vi.setSystemTime(localNoon("2026-07-04"));
    vi.advanceTimersByTime(SCAN_INTERVAL_MS);

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(generateSpy).toHaveBeenCalledWith("2026-07-04");
  });

  it("visibilitychange の可視復帰+日付変更でスキャンする", () => {
    const generateSpy = spyGenerate();
    renderHook(() => useNotificationScan());
    generateSpy.mockClear();

    vi.setSystemTime(localNoon("2026-07-04"));
    // jsdom の document.visibilityState は既定で "visible"。
    document.dispatchEvent(new Event("visibilitychange"));

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(generateSpy).toHaveBeenCalledWith("2026-07-04");
  });

  it("アンマウント後はインターバル・visibilitychange いずれでもスキャンしない", () => {
    const generateSpy = spyGenerate();
    const { unmount } = renderHook(() => useNotificationScan());
    generateSpy.mockClear();
    unmount();

    vi.setSystemTime(localNoon("2026-07-05"));
    vi.advanceTimersByTime(SCAN_INTERVAL_MS * 2);
    document.dispatchEvent(new Event("visibilitychange"));

    expect(generateSpy).not.toHaveBeenCalled();
  });
});
