/**
 * 項目は物理削除せず isActive で無効化する。
 */

import { addEntity } from '@/store/entityActions';
import type { AppSliceCreator } from '@/store/storeState';
import {
  type DistributiveOmit,
  EXECUTION,
  type ServiceItem,
  type ServiceItemBase,
  type ServiceItemExecution,
} from '@/store/types';
import { recordValue } from '@/utils/record';

export type ServiceItemInput = DistributiveOmit<ServiceItem, 'id'>;

/**
 * 実施区分に関わる3属性（execution / vendorId / leadTimeDays）は組でしか更新できない（D-106）。
 * `{ execution: 'external' }` だけを渡して依頼先のない外部項目を作る更新を型で弾く。
 */
export type ServiceItemPatch = Partial<Omit<ServiceItemBase, 'id'>> &
  (
    | ServiceItemExecution
    | { execution?: undefined; vendorId?: undefined; leadTimeDays?: undefined }
  );

export type ServiceItemSlice = {
  serviceItems: Record<string, ServiceItem>;
  /** @returns 生成したServiceItemのid */
  addServiceItem: (input: ServiceItemInput) => string;
  updateServiceItem: (id: string, patch: ServiceItemPatch) => void;
};

export const createServiceItemSlice: AppSliceCreator<ServiceItemSlice> = (set) => ({
  serviceItems: {},

  addServiceItem: (input): string => addEntity(set, (state) => state.serviceItems, input),

  updateServiceItem: (id, patch): void => {
    set((state) => {
      const entry = recordValue(state.serviceItems, id);
      if (entry === undefined) return;
      Object.assign(
        entry,
        // 内部実施へ切り替える patch は、キーが省略されていても既存の依頼先・納期を必ず落とす
        patch.execution === EXECUTION.INTERNAL
          ? { ...patch, vendorId: undefined, leadTimeDays: undefined }
          : patch,
      );
    });
  },
});
