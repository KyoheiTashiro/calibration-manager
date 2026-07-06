/**
 * 発注推奨日の逆算（domain-model.md §4.2。外部点検校正のみ）。
 * `leadTime = serviceItem.leadTimeDays ?? vendor.standardLeadTimeDays`
 * `発注推奨日 = nextDueDate − leadTime − bufferDays`
 */

import { EXECUTION, type ServiceItem, type IsoDateString, type Vendor } from "@/store/types";
import { addDays } from "@/utils/time";

/** vendor が null 許容なのは、依頼先未設定・参照切れの項目でも呼び出せるようにするため */
export const resolveLeadTime = (
  serviceItem: Pick<ServiceItem, "leadTimeDays">,
  vendor: Pick<Vendor, "standardLeadTimeDays"> | null,
): number | null => serviceItem.leadTimeDays ?? vendor?.standardLeadTimeDays ?? null;

/**
 * 発注推奨日を返す。計算できない場合は null（例外を投げない）:
 * - 内部実施の項目（発注の概念がない）
 * - 納期が serviceItem・vendor のどちらからも解決できない
 * - nextDueDate が日付として不正
 */
export const recommendedOrderDate = (
  serviceItem: Pick<ServiceItem, "execution" | "leadTimeDays" | "bufferDays" | "nextDueDate">,
  vendor: Pick<Vendor, "standardLeadTimeDays"> | null,
): IsoDateString | null => {
  if (serviceItem.execution !== EXECUTION.EXTERNAL) return null;
  const leadTimeDays = resolveLeadTime(serviceItem, vendor);
  if (leadTimeDays === null) return null;
  return addDays(serviceItem.nextDueDate, -(leadTimeDays + serviceItem.bufferDays));
};
