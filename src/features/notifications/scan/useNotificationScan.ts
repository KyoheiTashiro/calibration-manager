/** 通知スキャンの起動フック。App.tsx で1度だけマウントする。 */

import type { IsoDateString } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { todayIsoDate } from "@/utils/time";
import { useEffect, useRef } from "react";

/** ポーリング間隔。日跨ぎ放置タブを拾うため60秒ごとに日付を確認する（D-025） */
const SCAN_INTERVAL_MS = 60_000;

export const useNotificationScan = (): void => {
  const generateNotifications = useAppStore((state) => state.generateNotifications);
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
