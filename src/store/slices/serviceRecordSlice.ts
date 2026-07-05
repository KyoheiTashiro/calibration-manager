/**
 * 実施記録スライス（store.md「スライス構成」）。
 * addServiceRecord は期限更新・案件完了のカスケードを持つドメインの心臓部
 * （store.md「アクション仕様」、domain-model.md §3.5・§3.6）。
 */

import { addCycle } from "@/domain/dateCycle";
import { canTransitionServiceOrderStatus } from "@/domain/serviceOrderStatus";
import type { AppSliceCreator } from "@/store/storeState";
import { type ServiceRecord, SERVICE_ORDER_STATUS, SERVICE_RECORD_RESULT } from "@/store/types";
import { createId } from "@/utils/id";
import { recordValue } from "@/utils/record";

export type AddServiceRecordInput = Omit<ServiceRecord, "id">;

export type ServiceRecordSlice = {
  serviceRecords: Record<string, ServiceRecord>;
  /**
   * 実施記録を追加し、以下をカスケードする（store.md「アクション仕様」）:
   * - 常に serviceItem.lastDoneDate = doneDate（screen-design/07-service-record-modal.md 副作用2。D-015）
   * - result !== 'fail': nextDueDate = addCycle(doneDate, cycle)
   * - result === 'fail': 次回期限のみ据え置き（domain-model.md §3.5）
   * - serviceOrderId 指定時: 対象 ServiceOrder を completed に遷移（domain-model.md §3.6）
   *
   * 原子性優先で、以下は記録追加ごと no-op（D-005）:
   * - serviceItemId が存在しない / doneDate から次回期限を計算できない
   * - serviceOrderId の案件が存在しない、または completed へ遷移不可（returned 以外）
   *
   * @returns 生成した記録のid。no-op 時は null
   */
  addServiceRecord: (input: AddServiceRecordInput) => string | null;
};

export const createServiceRecordSlice: AppSliceCreator<ServiceRecordSlice> = (set, get) => ({
  serviceRecords: {},

  addServiceRecord: (input): string | null => {
    const { serviceItems, serviceOrders } = get();
    const serviceItem = recordValue(serviceItems, input.serviceItemId);
    if (!serviceItem) return null;

    const shouldAdvanceDueDate = input.result !== SERVICE_RECORD_RESULT.FAIL;
    const nextDueDate = shouldAdvanceDueDate ? addCycle(input.doneDate, serviceItem.cycle) : null;
    if (shouldAdvanceDueDate && nextDueDate === null) return null;

    if (input.serviceOrderId !== undefined) {
      const serviceOrder = recordValue(serviceOrders, input.serviceOrderId);
      if (
        !serviceOrder ||
        !canTransitionServiceOrderStatus(serviceOrder.status, SERVICE_ORDER_STATUS.COMPLETED)
      ) {
        return null;
      }
    }

    const id = createId();
    set((state) => {
      state.serviceRecords[id] = { ...input, id };
      const draftServiceItem = recordValue(state.serviceItems, input.serviceItemId);
      if (draftServiceItem !== undefined) {
        draftServiceItem.lastDoneDate = input.doneDate;
        if (nextDueDate !== null) draftServiceItem.nextDueDate = nextDueDate;
      }
      if (input.serviceOrderId !== undefined) {
        const draftServiceOrder = recordValue(state.serviceOrders, input.serviceOrderId);
        if (draftServiceOrder !== undefined) {
          draftServiceOrder.status = SERVICE_ORDER_STATUS.COMPLETED;
        }
      }
    });
    return id;
  },
});
