/**
 * ステータスバッジの色・ラベルの単一マッピング（screen-design/README.md §0.3、
 * ui-guidelines.md §4）。全画面がこのヘルパを使い、コンポーネント側で色・文言を
 * 個別定義しない。バッジは常に「色 + 日本語ラベル」をセットで表示する（色のみ禁止）。
 */

import { SERVICE_ITEM_STATUS, type ServiceItemStatus } from '@/domain/serviceItemStatus';

/**
 * ステータス→Tailwindクラス・日本語ラベル（screen-design/README.md §0.3）。
 * `-100` 背景 × `-800` 文字 × `-300` 枠線の組は WCAG AA（4.5:1）を満たす設計値（ui-guidelines.md §4）。
 * 特に dueSoon（黄）は素の黄色文字だと対白コントラストが不足するため、
 * 必ず yellow-800 濃色文字との組み合わせで用いる。
 */
const STATUS_BADGES = {
  [SERVICE_ITEM_STATUS.OVERDUE]: {
    className: 'bg-red-100 text-red-800 border border-red-300',
    label: '期限切れ',
  },
  [SERVICE_ITEM_STATUS.ORDER_NOW]: {
    className: 'bg-orange-100 text-orange-800 border border-orange-300',
    label: '要発注',
  },
  [SERVICE_ITEM_STATUS.IN_PROGRESS]: {
    className: 'bg-blue-100 text-blue-800 border border-blue-300',
    label: '校正中',
  },
  [SERVICE_ITEM_STATUS.DUE_SOON]: {
    className: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    label: '期限接近',
  },
  [SERVICE_ITEM_STATUS.OK]: {
    className: 'bg-green-100 text-green-800 border border-green-300',
    label: '正常',
  },
} as const satisfies Record<ServiceItemStatus, { className: string; label: string }>;

export const statusBadgeClass = (status: ServiceItemStatus): string =>
  STATUS_BADGES[status].className;

export const statusBadgeLabel = (status: ServiceItemStatus): string => STATUS_BADGES[status].label;
