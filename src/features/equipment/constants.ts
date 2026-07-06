import { EQUIPMENT_STATUS, type EquipmentStatus } from "@/store/types";

export const EQUIPMENT_STATUS_LABELS = {
  [EQUIPMENT_STATUS.ACTIVE]: "稼働",
  [EQUIPMENT_STATUS.SUSPENDED]: "休止",
  [EQUIPMENT_STATUS.RETIRED]: "廃棄",
} as const satisfies Record<EquipmentStatus, string>;

/** `-100`背景 × `-800`文字 × `-300`枠線の WCAG AA 設計値は domain/statusBadge.ts と同一方針。 */
export const EQUIPMENT_STATUS_BADGE_CLASSES = {
  [EQUIPMENT_STATUS.ACTIVE]: "bg-green-100 text-green-800 border border-green-300",
  [EQUIPMENT_STATUS.SUSPENDED]: "bg-slate-100 text-slate-800 border border-slate-300",
  [EQUIPMENT_STATUS.RETIRED]: "bg-slate-100 text-slate-500 border border-slate-300",
} as const satisfies Record<EquipmentStatus, string>;
