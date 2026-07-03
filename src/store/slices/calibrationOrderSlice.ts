/**
 * 校正案件スライス（store.md「スライス構成」）。
 * 状態遷移は domain/orderStatus.ts の許可テーブルで検証する（domain-model.md §3.6）。
 */

import { canTransitionOrderStatus, isActiveOrderStatus } from "@/domain/orderStatus";
import type { AppSliceCreator } from "@/store/storeState";
import { type CalibrationOrder, ORDER_STATUS, type OrderStatus } from "@/store/types";
import { createId } from "@/utils/id";
import { recordValue } from "@/utils/record";

export type AddOrderInput = Omit<CalibrationOrder, "id" | "status">;

export type CalibrationOrderSlice = {
  orders: Record<string, CalibrationOrder>;
  /**
   * 案件を初期状態 planned で追加する。1項目1有効案件の制約をストア層で強制し、
   * 対象項目が存在しない・有効案件（planned〜returned）が既にある場合は no-op
   * （decisions.md D-006）。
   * @returns 生成した案件のid。no-op 時は null
   */
  addOrder: (input: AddOrderInput) => string | null;
  /** status 以外の属性更新。status は updateOrderStatus / addRecord 経由のみ */
  updateOrder: (id: string, patch: Partial<Omit<CalibrationOrder, "id" | "status">>) => void;
  /**
   * 遷移許可テーブルで検証し、許可されない遷移は no-op（store.md「アクション仕様」）。
   * completed への遷移は addRecord のカスケード専用のため本アクションでは常に拒否する。
   * @returns 遷移できたら true
   */
  updateOrderStatus: (id: string, nextStatus: OrderStatus) => boolean;
};

export const createCalibrationOrderSlice: AppSliceCreator<CalibrationOrderSlice> = (set, get) => ({
  orders: {},

  addOrder: (input): string | null => {
    const { inspectionItems, orders } = get();
    if (recordValue(inspectionItems, input.inspectionItemId) === undefined) return null;
    const hasActiveOrder = Object.values(orders).some(
      (order) =>
        order.inspectionItemId === input.inspectionItemId && isActiveOrderStatus(order.status),
    );
    if (hasActiveOrder) return null;

    const id = createId();
    set((state) => {
      state.orders[id] = { ...input, id, status: ORDER_STATUS.PLANNED };
    });
    return id;
  },

  updateOrder: (id, patch): void => {
    set((state) => {
      const order = state.orders[id];
      if (!order) return;
      Object.assign(order, patch);
    });
  },

  updateOrderStatus: (id, nextStatus): boolean => {
    const order = recordValue(get().orders, id);
    if (!order) return false;
    if (nextStatus === ORDER_STATUS.COMPLETED) return false;
    if (!canTransitionOrderStatus(order.status, nextStatus)) return false;
    set((state) => {
      const draftOrder = state.orders[id];
      if (draftOrder) draftOrder.status = nextStatus;
    });
    return true;
  },
});
