/**
 * 設定・バックアップ画面(screen-design/11-settings.md §11)。
 * CSV エクスポート / インポート / データ全削除の3セクションを束ねる薄いビュー。
 * 各セクションの手続きは ExportSection / ImportSection / DangerSection に分割する
 * (oxlint の依存数上限・max-statements 対策、dashboard と同じ分割イディオム)。
 */

import { DangerSection } from "@/features/settings/DangerSection";
import { ExportSection } from "@/features/settings/ExportSection";
import { ImportSection } from "@/features/settings/ImportSection";
import type { AppState } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import type { ReactElement } from "react";

export const Settings = (): ReactElement => {
  // なぜ: エクスポート対象の Record とインポート参照整合の突合先を1スナップショットに集約する。
  const state: AppState = {
    vendors: useAppStore((store) => store.vendors),
    persons: useAppStore((store) => store.persons),
    equipment: useAppStore((store) => store.equipment),
    inspectionItems: useAppStore((store) => store.inspectionItems),
    records: useAppStore((store) => store.records),
    orders: useAppStore((store) => store.orders),
    notifications: useAppStore((store) => store.notifications),
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-bold">設定・バックアップ</h1>
      <ExportSection state={state} />
      <ImportSection state={state} />
      <DangerSection />
    </div>
  );
};
