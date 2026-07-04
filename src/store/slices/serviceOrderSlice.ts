/**
 * 点検校正外部案件スライス（store.md「スライス構成」）。
 * 状態遷移は domain/serviceOrderStatus.ts の許可テーブルで検証する（domain-model.md §3.6）。
 */

import { canTransitionServiceOrderStatus, isActiveServiceOrderStatus } from "@/domain/serviceOrderStatus";
import type { AppSliceCreator } from "@/store/storeState";
import { type ServiceOrder, SERVICE_ORDER_STATUS, type ServiceOrderStatus } from "@/store/types";
import { createId } from "@/utils/id";
import { recordValue } from "@/utils/record";

export type AddServiceOrderInput = Omit<ServiceOrder, "id" | "status">;

export type ServiceOrderSlice = {
  serviceOrders: Record<string, ServiceOrder>;
  /**
   * 案件を初期状態 planned で追加する。1項目1有効案件の制約をストア層で強制し、
   * 対象項目が存在しない・有効案件（planned〜returned）が既にある場合は no-op
   * （D-006）。
   * @returns 生成した案件のid。no-op 時は null
   */
  addServiceOrder: (input: AddServiceOrderInput) => string | null;
  /** status 以外の属性更新。status は updateServiceOrderStatus / addRecord 経由のみ */
  updateServiceOrder: (id: string, patch: Partial<Omit<ServiceOrder, "id" | "status">>) => void;
  /**
   * 遷移許可テーブルで検証し、許可されない遷移は no-op（store.md「アクション仕様」）。
   * completed への遷移は addRecord のカスケード専用のため本アクションでは常に拒否する。
   * @returns 遷移できたら true
   */
  updateServiceOrderStatus: (id: string, nextStatus: ServiceOrderStatus) => boolean;
};

export const createServiceOrderSlice: AppSliceCreator<ServiceOrderSlice> = (set, get) => ({
  serviceOrders: {},

  addServiceOrder: (input): string | null => {
    const { serviceItems, serviceOrders } = get();
    if (recordValue(serviceItems, input.serviceItemId) === undefined) return null;
    const hasActiveServiceOrder = Object.values(serviceOrders).some(
      (serviceOrder) =>
        serviceOrder.serviceItemId === input.serviceItemId && isActiveServiceOrderStatus(serviceOrder.status),
    );
    if (hasActiveServiceOrder) return null;

    const id = createId();
    set((state) => {
      state.serviceOrders[id] = { ...input, id, status: SERVICE_ORDER_STATUS.PLANNED };
    });
    return id;
  },

  updateServiceOrder: (id, patch): void => {
    set((state) => {
      const serviceOrder = recordValue(state.serviceOrders, id);
      if (serviceOrder === undefined) return;
      Object.assign(serviceOrder, patch);
    });
  },

  updateServiceOrderStatus: (id, nextStatus): boolean => {
    const serviceOrder = recordValue(get().serviceOrders, id);
    if (!serviceOrder) return false;
    if (nextStatus === SERVICE_ORDER_STATUS.COMPLETED) return false;
    if (!canTransitionServiceOrderStatus(serviceOrder.status, nextStatus)) return false;
    set((state) => {
      const draftServiceOrder = recordValue(state.serviceOrders, id);
      if (draftServiceOrder !== undefined) draftServiceOrder.status = nextStatus;
    });
    return true;
  },
});
