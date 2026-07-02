/**
 * 実施記録スライス（store.md「スライス構成」）。
 * addRecord は期限更新・案件完了のカスケードを持つドメインの心臓部
 * （store.md「アクション仕様」、domain-model.md §3.5・§3.6）。
 */

import { addCycle } from "@/domain/dateCycle";
import { canTransitionOrderStatus } from "@/domain/orderStatus";
import type { AppSliceCreator } from "@/store/storeState";
import { type InspectionRecord, ORDER_STATUS, RECORD_RESULT } from "@/store/types";
import { createId } from "@/utils/id";
import { recordValue } from "@/utils/record";

export type AddRecordInput = Omit<InspectionRecord, "id">;

export type InspectionRecordSlice = {
  records: Record<string, InspectionRecord>;
  /**
   * 実施記録を追加し、以下をカスケードする（store.md「アクション仕様」）:
   * - result !== 'fail': item.lastDoneDate = doneDate、nextDueDate = addCycle(doneDate, cycle)
   * - result === 'fail': 次回期限は据え置き（domain-model.md §3.5）
   * - orderId 指定時: 対象 CalibrationOrder を completed に遷移（domain-model.md §3.6）
   *
   * 原子性優先で、以下は記録追加ごと no-op（decisions.md D-005）:
   * - itemId が存在しない / doneDate から次回期限を計算できない
   * - orderId の案件が存在しない、または completed へ遷移不可（returned 以外）
   *
   * @returns 生成した記録のid。no-op 時は null
   */
  addRecord: (input: AddRecordInput) => string | null;
};

export const createInspectionRecordSlice: AppSliceCreator<InspectionRecordSlice> = (set, get) => ({
  records: {},

  addRecord: (input): string | null => {
    const { items, orders } = get();
    const item = recordValue(items, input.itemId);
    if (!item) return null;

    const shouldAdvanceDueDate = input.result !== RECORD_RESULT.FAIL;
    const nextDueDate = shouldAdvanceDueDate ? addCycle(input.doneDate, item.cycle) : null;
    if (shouldAdvanceDueDate && nextDueDate === null) return null;

    if (input.orderId !== undefined) {
      const order = recordValue(orders, input.orderId);
      if (!order || !canTransitionOrderStatus(order.status, ORDER_STATUS.COMPLETED)) return null;
    }

    const id = createId();
    set((state) => {
      state.records[id] = { ...input, id };
      const draftItem = state.items[input.itemId];
      if (draftItem && nextDueDate !== null) {
        draftItem.lastDoneDate = input.doneDate;
        draftItem.nextDueDate = nextDueDate;
      }
      if (input.orderId !== undefined) {
        const draftOrder = state.orders[input.orderId];
        if (draftOrder) draftOrder.status = ORDER_STATUS.COMPLETED;
      }
    });
    return id;
  },
});
