import { AlertTriangleIcon, CartIcon, CheckIcon, ClockIcon, RefreshIcon } from "@/components/icons";
import type { IconProps } from "@/components/icons/base";
import { SERVICE_ITEM_STATUS, type ServiceItemStatus } from "@/domain/serviceItemStatus";
import { statusBadgeClass, statusBadgeLabel } from "@/domain/statusBadge";
import type { ComponentType, ReactElement } from "react";

/**
 * ステータス→アイコンコンポーネント。通知バッジのアイコン(NOTIFICATION_TYPE_ICONS、D-064)と
 * 同義の状態(期限切れ/要発注/期限接近)は同じ形状に統一する(D-069)。
 * domain/ は React 非依存のため、このマッピングは domain ではなくコンポーネント側に置く。
 */
const STATUS_BADGE_ICONS = {
  [SERVICE_ITEM_STATUS.OVERDUE]: AlertTriangleIcon,
  [SERVICE_ITEM_STATUS.ORDER_NOW]: CartIcon,
  [SERVICE_ITEM_STATUS.IN_PROGRESS]: RefreshIcon,
  [SERVICE_ITEM_STATUS.DUE_SOON]: ClockIcon,
  [SERVICE_ITEM_STATUS.OK]: CheckIcon,
} as const satisfies Record<ServiceItemStatus, ComponentType<IconProps>>;

/**
 * ステータスバッジ。色・日本語ラベルは常にセットで表示する。
 * 色・文言はここで個別定義せず、必ず domain/statusBadge.ts のヘルパー経由で取得する
 * （全画面で単一マッピングを共有するため）。
 * アイコンは通知アイコン(D-064)と同義同形状で統一し、色は currentColor でバッジ文字色を継承する(D-069)。
 */
export const StatusBadge = ({ status }: { status: ServiceItemStatus }): ReactElement => {
  const baseClassName = "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium";
  const className = `${baseClassName} ${statusBadgeClass(status)}`;
  const Icon = STATUS_BADGE_ICONS[status];

  return (
    <span className={className}>
      <Icon className="mr-1 h-3.5 w-3.5" />
      {statusBadgeLabel(status)}
    </span>
  );
};
