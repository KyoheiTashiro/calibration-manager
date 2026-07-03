/**
 * ステータスバッジの色・ラベルの単一マッピング（screen-design/README.md §0.3、
 * ui-guidelines.md §4）。全画面がこのヘルパを使い、コンポーネント側で色・文言を
 * 個別定義しない。バッジは常に「色 + 日本語ラベル」をセットで表示する（色のみ禁止）。
 */

import { INSPECTION_ITEM_STATUS, type InspectionItemStatus } from "@/domain/inspectionItemStatus";

/**
 * ステータス→Tailwindクラス。`-100` 背景 × `-800` 文字 × `-300` 枠線の組は
 * WCAG AA（4.5:1）を満たす設計値（ui-guidelines.md §4）。
 * 特に dueSoon（黄）は素の黄色文字だと対白コントラストが不足するため、
 * 必ず yellow-800 濃色文字との組み合わせで用いる。
 */
const STATUS_BADGE_CLASSES = {
  [INSPECTION_ITEM_STATUS.OVERDUE]: "bg-red-100 text-red-800 border border-red-300",
  [INSPECTION_ITEM_STATUS.ORDER_NOW]: "bg-orange-100 text-orange-800 border border-orange-300",
  [INSPECTION_ITEM_STATUS.IN_PROGRESS]: "bg-blue-100 text-blue-800 border border-blue-300",
  [INSPECTION_ITEM_STATUS.DUE_SOON]: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  [INSPECTION_ITEM_STATUS.OK]: "bg-green-100 text-green-800 border border-green-300",
} as const satisfies Record<InspectionItemStatus, string>;

/** ステータス→日本語ラベル（screen-design/README.md §0.3） */
const STATUS_BADGE_LABELS = {
  [INSPECTION_ITEM_STATUS.OVERDUE]: "期限切れ",
  [INSPECTION_ITEM_STATUS.ORDER_NOW]: "要発注",
  [INSPECTION_ITEM_STATUS.IN_PROGRESS]: "校正中",
  [INSPECTION_ITEM_STATUS.DUE_SOON]: "期限接近",
  [INSPECTION_ITEM_STATUS.OK]: "正常",
} as const satisfies Record<InspectionItemStatus, string>;

/** バッジのTailwindクラス文字列を返す */
export const statusBadgeClass = (status: InspectionItemStatus): string =>
  STATUS_BADGE_CLASSES[status];

/** バッジの日本語ラベルを返す */
export const statusBadgeLabel = (status: InspectionItemStatus): string =>
  STATUS_BADGE_LABELS[status];
