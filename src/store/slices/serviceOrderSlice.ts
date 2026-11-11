/**
 * 状態遷移と、遷移に伴う日付の書込を1アクションにまとめる（D-106）。
 * status ごとに必須・禁止の日付が型で決まるため（types.ts の ServiceOrder）、
 * 「遷移だけ」「日付だけ」の更新口は持たない。遷移の可否は domain/serviceOrderStatus.ts の許可テーブルが正。
 */

import {
  canTransitionServiceOrderStatus,
  hasActiveServiceOrder,
} from '@/domain/serviceOrderStatus';
import type { AppSliceCreator } from '@/store/storeState';
import { type IsoDateString, type ServiceOrder, SERVICE_ORDER_STATUS } from '@/store/types';
import { createId } from '@/utils/id';
import { recordValue } from '@/utils/record';

/** 作成時は常に planned のため、発注日・実返却日は受け取らない */
export type AddServiceOrderInput = Pick<
  ServiceOrder,
  'serviceItemId' | 'vendorId' | 'dueDate' | 'cost' | 'note'
>;

export type OrderServiceOrderInput = {
  orderedDate: IsoDateString;
  /** 未指定なら作成時に入力済みの値を保つ */
  dueDate?: IsoDateString;
  /** 未指定なら作成時に入力済みの値を保つ */
  cost?: number;
};

export type ServiceOrderSlice = {
  serviceOrders: Record<string, ServiceOrder>;
  /**
   * 案件を初期状態 planned で追加する。1項目1有効案件の制約をストア層で強制し、
   * 対象項目が存在しない・有効案件（planned〜returned）が既にある場合は no-op。
   * @returns 生成した案件のid。no-op 時は null
   */
  addServiceOrder: (input: AddServiceOrderInput) => string | null;
  /** planned → ordered。@returns 遷移できたら true（対象なし・planned 以外は no-op で false） */
  orderServiceOrder: (id: string, input: OrderServiceOrderInput) => boolean;
  /** ordered → inCalibration。@returns 遷移できたら true */
  startServiceOrderCalibration: (id: string) => boolean;
  /** inCalibration → returned。@returns 遷移できたら true */
  returnServiceOrder: (id: string, returnedDate: IsoDateString) => boolean;
  /** planned〜returned → cancelled。@returns 遷移できたら true */
  cancelServiceOrder: (id: string) => boolean;
};

export const createServiceOrderSlice: AppSliceCreator<ServiceOrderSlice> = (set, get) => {
  /** 現在の案件から遷移後の案件を組み立てて丸ごと置き換える。build が null を返したら no-op */
  const transition = (
    id: string,
    build: (current: ServiceOrder) => ServiceOrder | null,
  ): boolean => {
    const current = recordValue(get().serviceOrders, id);
    const next = current === undefined ? null : build(current);
    if (next === null) return false;
    set((state) => {
      state.serviceOrders[id] = next;
    });
    return true;
  };

  return {
    serviceOrders: {},

    addServiceOrder: (input): string | null => {
      const { serviceItems, serviceOrders } = get();
      if (recordValue(serviceItems, input.serviceItemId) === undefined) return null;
      if (hasActiveServiceOrder(Object.values(serviceOrders), input.serviceItemId)) return null;

      const id = createId();
      set((state) => {
        state.serviceOrders[id] = { ...input, id, status: SERVICE_ORDER_STATUS.PLANNED };
      });
      return id;
    },

    // 以下3つは status のナローが許可テーブルの隣接遷移と同じ判定になる（型で発注日・実返却日の要否を確定させるため）
    orderServiceOrder: (id, input): boolean =>
      transition(id, (current) =>
        current.status === SERVICE_ORDER_STATUS.PLANNED
          ? {
              ...current,
              status: SERVICE_ORDER_STATUS.ORDERED,
              orderedDate: input.orderedDate,
              dueDate: input.dueDate ?? current.dueDate,
              cost: input.cost ?? current.cost,
            }
          : null,
      ),

    startServiceOrderCalibration: (id): boolean =>
      transition(id, (current) =>
        current.status === SERVICE_ORDER_STATUS.ORDERED
          ? { ...current, status: SERVICE_ORDER_STATUS.IN_CALIBRATION }
          : null,
      ),

    returnServiceOrder: (id, returnedDate): boolean =>
      transition(id, (current) =>
        current.status === SERVICE_ORDER_STATUS.IN_CALIBRATION
          ? { ...current, status: SERVICE_ORDER_STATUS.RETURNED, returnedDate }
          : null,
      ),

    cancelServiceOrder: (id): boolean =>
      transition(id, (current) =>
        canTransitionServiceOrderStatus(current.status, SERVICE_ORDER_STATUS.CANCELLED)
          ? { ...current, status: SERVICE_ORDER_STATUS.CANCELLED }
          : null,
      ),
  };
};
