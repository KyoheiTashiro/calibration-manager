/**
 * 点検校正外部案件ボードのカード（screen-design/08-service-orders.md）。
 */

import { Button } from "@/components/ui";
import { CARD_ACTION, type CardAction } from "@/features/serviceOrder/constants";
import {
  SERVICE_ORDER_STATUS,
  type ServiceOrder,
  type ServiceOrderStatus,
  type Equipment,
  type ServiceItem,
  type Vendor,
} from "@/store/types";
import { recordValue } from "@/utils/record";
import type { ReactElement, ReactNode } from "react";

/** 参照先が消えている場合の表示 */
const NO_REFERENCE_LABEL = "(参照先なし)";
/** 属性が未設定のときの表示 */
const UNSET_LABEL = "—";

type CardActionSpec = { label: string; action: CardAction; variant?: "danger" };

/** 状態別のカードアクション定義(表示順・ラベル・variant を一元化) */
const STATUS_ACTIONS: Record<ServiceOrderStatus, readonly CardActionSpec[]> = {
  [SERVICE_ORDER_STATUS.PLANNED]: [
    { label: "発注する", action: CARD_ACTION.ORDER },
    { label: "中止", action: CARD_ACTION.CANCEL, variant: "danger" },
  ],
  [SERVICE_ORDER_STATUS.ORDERED]: [
    { label: "校正中へ", action: CARD_ACTION.ADVANCE },
    { label: "中止", action: CARD_ACTION.CANCEL, variant: "danger" },
  ],
  [SERVICE_ORDER_STATUS.IN_CALIBRATION]: [
    { label: "返却する", action: CARD_ACTION.RETURN },
    { label: "中止", action: CARD_ACTION.CANCEL, variant: "danger" },
  ],
  [SERVICE_ORDER_STATUS.RETURNED]: [{ label: "記録登録", action: CARD_ACTION.SERVICE_RECORD }],
  [SERVICE_ORDER_STATUS.COMPLETED]: [],
  [SERVICE_ORDER_STATUS.CANCELLED]: [],
};

type Props = {
  serviceOrder: ServiceOrder;
  serviceItems: Record<string, ServiceItem>;
  equipment: Record<string, Equipment>;
  vendors: Record<string, Vendor>;
  onAction: (action: CardAction, serviceOrder: ServiceOrder) => void;
};

export const ServiceOrderCard = ({
  serviceOrder,
  serviceItems,
  equipment,
  vendors,
  onAction,
}: Props): ReactElement => {
  const serviceItem = recordValue(serviceItems, serviceOrder.serviceItemId);
  const equipmentEntry = serviceItem ? recordValue(equipment, serviceItem.equipmentId) : undefined;
  const vendor = recordValue(vendors, serviceOrder.vendorId);

  const managementNo = equipmentEntry?.managementNo ?? NO_REFERENCE_LABEL;
  const equipmentName = equipmentEntry?.name ?? NO_REFERENCE_LABEL;
  const serviceItemName = serviceItem?.name ?? NO_REFERENCE_LABEL;
  const vendorName = vendor?.name ?? NO_REFERENCE_LABEL;

  const isClosed =
    serviceOrder.status === SERVICE_ORDER_STATUS.COMPLETED ||
    serviceOrder.status === SERVICE_ORDER_STATUS.CANCELLED;

  const renderActions = (): ReactNode =>
    STATUS_ACTIONS[serviceOrder.status].map(({ label, action, variant }) => (
      <Button
        key={action}
        size="sm"
        variant={variant}
        onClick={() => {
          onAction(action, serviceOrder);
        }}
      >
        {label}
      </Button>
    ));

  return (
    <div
      className={`rounded border p-3 text-sm ${
        isClosed ? "border-slate-200 bg-slate-100 text-slate-500" : "border-slate-300 bg-white"
      }`}
    >
      <p className="font-semibold">{managementNo}</p>
      <p>{equipmentName}</p>
      <p className="text-slate-600">{serviceItemName}</p>
      <dl className="mt-2 flex flex-col gap-0.5 text-xs text-slate-600">
        <div>
          <dt className="inline text-slate-500">校正依頼先: </dt>
          <dd className="inline">{vendorName}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">発注日: </dt>
          <dd className="inline">{serviceOrder.orderedDate ?? UNSET_LABEL}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">返却予定日: </dt>
          <dd className="inline">{serviceOrder.dueDate ?? UNSET_LABEL}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">費用: </dt>
          <dd className="inline">
            {serviceOrder.cost === undefined ? UNSET_LABEL : `${serviceOrder.cost}円`}
          </dd>
        </div>
      </dl>
      {isClosed ? null : <div className="mt-3 flex flex-wrap gap-2">{renderActions()}</div>}
    </div>
  );
};
