/**
 * 点検校正外部案件かんばんのカード（screen-design/08-service-orders.md）。
 * serviceItem→equipment→managementNo/機器名、serviceItem.name、vendor→依頼先名を解決して表示する。
 * 参照先エンティティが消えている（dangling）場合は例外を投げず「(参照先なし)」表示（D-003）。
 * completed / cancelled はグレー調でアクションボタンなし（D-018）。
 */

import { Button } from "@/components/ui";
import {
  SERVICE_ORDER_STATUS,
  type ServiceOrder,
  type Equipment,
  type ServiceItem,
  type Vendor,
} from "@/store/types";
import { recordValue } from "@/utils/record";
import type { ReactElement, ReactNode } from "react";

/** 参照先が消えている（dangling FK）ときの表示。D-003 の寛容方針で例外を投げず表示に留める */
const NO_REFERENCE_LABEL = "(参照先なし)";
/** 属性が未設定のときの表示 */
const UNSET_LABEL = "—";

type Props = {
  serviceOrder: ServiceOrder;
  serviceItems: Record<string, ServiceItem>;
  equipment: Record<string, Equipment>;
  vendors: Record<string, Vendor>;
  onOrder: (serviceOrder: ServiceOrder) => void;
  onAdvance: (serviceOrder: ServiceOrder) => void;
  onReturn: (serviceOrder: ServiceOrder) => void;
  onCancel: (serviceOrder: ServiceOrder) => void;
  onRecord: (serviceOrder: ServiceOrder) => void;
};

export const ServiceOrderCard = ({
  serviceOrder,
  serviceItems,
  equipment,
  vendors,
  onOrder,
  onAdvance,
  onReturn,
  onCancel,
  onRecord,
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

  const renderActions = (): ReactNode => {
    switch (serviceOrder.status) {
      case SERVICE_ORDER_STATUS.PLANNED: {
        return (
          <>
            <Button
              size="sm"
              onClick={() => {
                onOrder(serviceOrder);
              }}
            >
              発注する
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onCancel(serviceOrder);
              }}
            >
              中止
            </Button>
          </>
        );
      }
      case SERVICE_ORDER_STATUS.ORDERED: {
        return (
          <>
            <Button
              size="sm"
              onClick={() => {
                onAdvance(serviceOrder);
              }}
            >
              校正中へ
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onCancel(serviceOrder);
              }}
            >
              中止
            </Button>
          </>
        );
      }
      case SERVICE_ORDER_STATUS.IN_CALIBRATION: {
        return (
          <>
            <Button
              size="sm"
              onClick={() => {
                onReturn(serviceOrder);
              }}
            >
              返却する
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onCancel(serviceOrder);
              }}
            >
              中止
            </Button>
          </>
        );
      }
      case SERVICE_ORDER_STATUS.RETURNED: {
        return (
          <Button
            size="sm"
            onClick={() => {
              onRecord(serviceOrder);
            }}
          >
            記録登録
          </Button>
        );
      }
      case SERVICE_ORDER_STATUS.COMPLETED:
      case SERVICE_ORDER_STATUS.CANCELLED: {
        // completed / cancelled はアクションなし（D-018）
        return null;
      }
      default: {
        return null;
      }
    }
  };

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
