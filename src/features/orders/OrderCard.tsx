/**
 * 外部校正案件かんばんのカード（screen-design/08-orders.md）。
 * item→equipment→managementNo/機器名、item.name、vendor→依頼先名を解決して表示する。
 * 参照先エンティティが消えている（dangling）場合は例外を投げず「(参照先なし)」表示（decisions.md D-003）。
 * completed / cancelled はグレー調でアクションボタンなし（D-018）。
 */

import { Button } from "@/components/ui";
import {
  ORDER_STATUS,
  type CalibrationOrder,
  type Equipment,
  type InspectionItem,
  type Vendor,
} from "@/store/types";
import type { ReactElement, ReactNode } from "react";

/** 参照先が消えている（dangling FK）ときの表示。D-003 の寛容方針で例外を投げず表示に留める */
const NO_REFERENCE_LABEL = "(参照先なし)";
/** 属性が未設定のときの表示 */
const UNSET_LABEL = "—";

type OrderCardProps = {
  order: CalibrationOrder;
  items: Record<string, InspectionItem>;
  equipment: Record<string, Equipment>;
  vendors: Record<string, Vendor>;
  onOrder: (order: CalibrationOrder) => void;
  onAdvance: (order: CalibrationOrder) => void;
  onReturn: (order: CalibrationOrder) => void;
  onCancel: (order: CalibrationOrder) => void;
  onRecord: (order: CalibrationOrder) => void;
};

export const OrderCard = ({
  order,
  items,
  equipment,
  vendors,
  onOrder,
  onAdvance,
  onReturn,
  onCancel,
  onRecord,
}: OrderCardProps): ReactElement => {
  const item = items[order.itemId];
  const equipmentEntry = item ? equipment[item.equipmentId] : undefined;
  const vendor = vendors[order.vendorId];

  const managementNo = equipmentEntry?.managementNo ?? NO_REFERENCE_LABEL;
  const equipmentName = equipmentEntry?.name ?? NO_REFERENCE_LABEL;
  const itemName = item?.name ?? NO_REFERENCE_LABEL;
  const vendorName = vendor?.name ?? NO_REFERENCE_LABEL;

  const isClosed =
    order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.CANCELLED;

  const renderActions = (): ReactNode => {
    switch (order.status) {
      case ORDER_STATUS.PLANNED: {
        return (
          <>
            <Button size="sm" onClick={() => onOrder(order)}>
              発注する
            </Button>
            <Button size="sm" variant="danger" onClick={() => onCancel(order)}>
              中止
            </Button>
          </>
        );
      }
      case ORDER_STATUS.ORDERED: {
        return (
          <>
            <Button size="sm" onClick={() => onAdvance(order)}>
              校正中へ
            </Button>
            <Button size="sm" variant="danger" onClick={() => onCancel(order)}>
              中止
            </Button>
          </>
        );
      }
      case ORDER_STATUS.IN_CALIBRATION: {
        return (
          <>
            <Button size="sm" onClick={() => onReturn(order)}>
              返却する
            </Button>
            <Button size="sm" variant="danger" onClick={() => onCancel(order)}>
              中止
            </Button>
          </>
        );
      }
      case ORDER_STATUS.RETURNED: {
        return (
          <Button size="sm" onClick={() => onRecord(order)}>
            記録登録
          </Button>
        );
      }
      default: {
        // completed / cancelled はアクションなし（D-018）
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
      <p className="text-slate-600">{itemName}</p>
      <dl className="mt-2 flex flex-col gap-0.5 text-xs text-slate-600">
        <div>
          <dt className="inline text-slate-500">依頼先: </dt>
          <dd className="inline">{vendorName}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">発注日: </dt>
          <dd className="inline">{order.orderedDate ?? UNSET_LABEL}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">返却予定日: </dt>
          <dd className="inline">{order.dueDate ?? UNSET_LABEL}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">費用: </dt>
          <dd className="inline">{order.cost === undefined ? UNSET_LABEL : `${order.cost}円`}</dd>
        </div>
      </dl>
      {isClosed ? null : <div className="mt-3 flex flex-wrap gap-2">{renderActions()}</div>}
    </div>
  );
};
