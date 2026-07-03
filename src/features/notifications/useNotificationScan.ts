/**
 * 通知スキャンの起動フック（D-025）。App.tsx で1度だけマウントする。
 *
 * (1) マウント時に即スキャン、(2) 60秒間隔のポーリング、(3) visibilitychange の可視復帰、
 * の3経路で todayIsoDate() を前回スキャン日（useRef・非永続）と比較し、異なる場合のみ
 * generateNotifications(today) を呼ぶ。同日内の再スキャンは無駄な走査を避けるため抑止する。
 */

import { useAppStore } from "@/store/useAppStore";
import type { IsoDateString } from "@/store/types";
import { todayIsoDate } from "@/utils/time";
import { useEffect, useRef } from "react";

/** ポーリング間隔。日跨ぎ放置タブを拾うため60秒ごとに日付を確認する（D-025） */
const SCAN_INTERVAL_MS = 60_000;

export const useNotificationScan = (): void => {
  // zustand のアクションは安定参照のため effect の依存に入れても再実行されない。
  const generateNotifications = useAppStore((state) => state.generateNotifications);
  // 前回スキャン日は非永続（D-025）。起動時は必ずスキャンするため null 初期化。
  const lastScanDateRef = useRef<IsoDateString | null>(null);

  useEffect(() => {
    const scanIfDateChanged = (): void => {
      const today = todayIsoDate();
      if (lastScanDateRef.current === today) return;
      lastScanDateRef.current = today;
      generateNotifications(today);
    };

    scanIfDateChanged();

    const intervalId = setInterval(scanIfDateChanged, SCAN_INTERVAL_MS);

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        scanIfDateChanged();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return (): void => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [generateNotifications]);
};
