import { ExportSection } from "@/features/settings/components/csv/ExportSection";
import { ImportSection } from "@/features/settings/components/csv/ImportSection";
import { PwaInstallSection } from "@/features/settings/components/pwa/PwaInstallSection";
import { ResetSection } from "@/features/settings/components/reset/ResetSection";
import type { AppState } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import type { ReactElement } from "react";

export const Settings = (): ReactElement => {
  // なぜ: エクスポート対象の Record とインポート参照整合の突合先を1スナップショットに集約する。
  const state: AppState = {
    vendors: useAppStore((store) => store.vendors),
    persons: useAppStore((store) => store.persons),
    equipment: useAppStore((store) => store.equipment),
    serviceItems: useAppStore((store) => store.serviceItems),
    serviceRecords: useAppStore((store) => store.serviceRecords),
    serviceOrders: useAppStore((store) => store.serviceOrders),
    notifications: useAppStore((store) => store.notifications),
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">設定</h1>
      <ExportSection state={state} />
      <ImportSection state={state} />
      <PwaInstallSection />
      <ResetSection />
    </div>
  );
};
