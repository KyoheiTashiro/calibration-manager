import { ROUTES } from "@/constants/routes";
import type { ServiceItemStatus } from "@/domain/serviceItemStatus";
import { statusBadgeClass, statusBadgeLabel } from "@/domain/statusBadge";
import { SUMMARY_CARD_STATUSES } from "@/features/dashboard/hooks";
import type { ReactElement } from "react";

/** 項目一覧のステータスフィルタを指定するクエリパラメータ名(parseServiceItemListFilters が読む "status") */
const SERVICE_ITEM_LIST_STATUS_PARAM = "status";

type Props = {
  counts: Record<ServiceItemStatus, number>;
  /** 遷移実行(useNavigate をそのまま渡す)。プリフィルタ済みの項目一覧URLを渡す */
  onNavigate: (path: string) => void;
};

const serviceItemListPathForStatus = (status: ServiceItemStatus): string =>
  `${ROUTES.SERVICE_ITEM_LIST}?${new URLSearchParams({ [SERVICE_ITEM_LIST_STATUS_PARAM]: status }).toString()}`;

export const SummaryCards = ({ counts, onNavigate }: Props): ReactElement => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {SUMMARY_CARD_STATUSES.map((status) => (
      <button
        key={status}
        type="button"
        onClick={() => {
          onNavigate(serviceItemListPathForStatus(status));
        }}
        className={`flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition hover:brightness-95 ${statusBadgeClass(status)}`}
      >
        <span className="text-sm font-medium">{statusBadgeLabel(status)}</span>
        <span className="text-3xl font-bold tabular-nums">{counts[status]}</span>
      </button>
    ))}
  </div>
);
