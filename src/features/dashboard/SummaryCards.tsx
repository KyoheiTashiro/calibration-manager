/**
 * ダッシュボードのサマリーカード4枚(01-dashboard.md)。
 * 件数集計は hooks.ts、色・ラベルは domain/statusBadge.ts の単一マッピングに委譲する薄いビュー。
 * クリックで /inspection-items?status=<値> へ遷移する(status 値は INSPECTION_ITEM_STATUS 列挙から。リテラル直書き禁止)。
 */

import { ROUTES } from "@/constants/routes";
import type { InspectionItemStatus } from "@/domain/inspectionItemStatus";
import { statusBadgeClass, statusBadgeLabel } from "@/domain/statusBadge";
import { SUMMARY_CARD_STATUSES } from "@/features/dashboard/hooks";
import type { ReactElement } from "react";

/** 項目一覧のステータスフィルタを指定するクエリパラメータ名(parseInspectionItemListFilters が読む "status") */
const INSPECTION_ITEM_LIST_STATUS_PARAM = "status";

type Props = {
  counts: Record<InspectionItemStatus, number>;
  /** 遷移実行(useNavigate をそのまま渡す)。プリフィルタ済みの項目一覧URLを渡す */
  onNavigate: (path: string) => void;
};

/** status に対応する項目一覧(プリフィルタ)への遷移先URLを組み立てる */
const inspectionItemListPathForStatus = (status: InspectionItemStatus): string =>
  `${ROUTES.INSPECTION_ITEM_LIST}?${new URLSearchParams({ [INSPECTION_ITEM_LIST_STATUS_PARAM]: status }).toString()}`;

export const SummaryCards = ({ counts, onNavigate }: Props): ReactElement => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {SUMMARY_CARD_STATUSES.map((status) => (
      <button
        key={status}
        type="button"
        onClick={() => onNavigate(inspectionItemListPathForStatus(status))}
        className={`flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition hover:brightness-95 ${statusBadgeClass(status)}`}
      >
        <span className="text-sm font-medium">{statusBadgeLabel(status)}</span>
        <span className="text-3xl font-bold tabular-nums">{counts[status]}</span>
      </button>
    ))}
  </div>
);
