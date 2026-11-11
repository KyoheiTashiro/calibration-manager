/**
 * 判別 union の型（types.ts の ServiceItem / ServiceOrder / Notification、D-106）を
 * 「既定値 + 上書き」で組み立てるテスト用ヘルパ。
 * 上書きの結果が型どおりの組み合わせになるかは TS では追えないため、スキーマで検証して返す。
 * 実施区分と依頼先、案件状態と日付が食い違う fixture は、テスト本体より前にここで失敗する。
 */

import { notificationSchema, serviceItemSchema, serviceOrderSchema } from '@/store/schema';
import {
  type IsoDateString,
  type Notification,
  SERVICE_ORDER_STATUS,
  type ServiceItem,
  type ServiceOrder,
  type ServiceOrderStatus,
} from '@/store/types';

export const toServiceItem = (raw: unknown): ServiceItem => serviceItemSchema.parse(raw);
export const toServiceOrder = (raw: unknown): ServiceOrder => serviceOrderSchema.parse(raw);
export const toNotification = (raw: unknown): Notification => notificationSchema.parse(raw);

/** 指定 status の案件が持つべき発注日・実返却日（持てない側は undefined で明示的に消す） */
export const serviceOrderDatesFor = (
  status: ServiceOrderStatus,
): { orderedDate: IsoDateString | undefined; returnedDate: IsoDateString | undefined } => ({
  orderedDate: status === SERVICE_ORDER_STATUS.PLANNED ? undefined : '2026-06-01',
  returnedDate:
    status === SERVICE_ORDER_STATUS.RETURNED || status === SERVICE_ORDER_STATUS.COMPLETED
      ? '2026-06-20'
      : undefined,
});
