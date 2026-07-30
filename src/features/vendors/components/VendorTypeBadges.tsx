import { Badge } from "@/components/ui";
import { UNSET_LABEL } from "@/constants/labels";
import type { Vendor } from "@/store/types";
import type { ReactElement } from "react";

// 種別バッジ: -100 背景 × -800 文字 × -300 枠線の組は statusBadge.ts と同じ WCAG AA 設計値
const MANUFACTURER_BADGE_CLASS_NAME = "bg-blue-100 text-blue-800 border border-blue-300";
const CALIBRATOR_BADGE_CLASS_NAME = "bg-emerald-100 text-emerald-800 border border-emerald-300";

/**
 * なぜ独立コンポーネントに切り出すか: VendorList の Td 内にそのまま書くと
 * 検索ボックス追加分のネストと合わせて jsx-max-depth の上限を超えるため、
 * ここで JSX のネスト深さを1にリセットする。
 */
export const VendorTypeBadges = ({ vendor }: { vendor: Vendor }): ReactElement => {
  if (!vendor.isManufacturer && !vendor.isCalibrator) return <span>{UNSET_LABEL}</span>;
  return (
    <span className="inline-flex gap-1">
      {vendor.isManufacturer && <Badge className={MANUFACTURER_BADGE_CLASS_NAME}>メーカー</Badge>}
      {vendor.isCalibrator && <Badge className={CALIBRATOR_BADGE_CLASS_NAME}>校正業者</Badge>}
    </span>
  );
};
