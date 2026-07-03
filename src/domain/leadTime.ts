/**
 * 発注推奨日の逆算（domain-model.md §4.2。外部校正のみ）。
 * `leadTime = inspectionItem.leadTimeDays ?? vendor.standardLeadTimeDays`
 * `発注推奨日 = nextDueDate − leadTime − bufferDays`
 */

import { EXECUTION, type InspectionItem, type IsoDateString, type Vendor } from "@/store/types";
import { addDays } from "@/utils/time";

/**
 * 納期（日数）を解決する。inspectionItem 側の個別納期を優先し、未設定なら依頼先の標準納期へ
 * フォールバックする（domain-model.md §4.2）。どちらも未設定なら null（推奨日を計算できない）。
 * vendor が null 許容なのは、依頼先未設定・参照切れの項目でも呼び出せるようにするため。
 */
export const resolveLeadTime = (
  inspectionItem: Pick<InspectionItem, "leadTimeDays">,
  vendor: Pick<Vendor, "standardLeadTimeDays"> | null,
): number | null => inspectionItem.leadTimeDays ?? vendor?.standardLeadTimeDays ?? null;

/**
 * 発注推奨日を返す。計算できない場合は null（例外を投げない。coding-standards.md §8）:
 * - 内部実施の項目（発注の概念がない。domain-model.md §4.2「外部のみ」）
 * - 納期が inspectionItem・vendor のどちらからも解決できない
 * - nextDueDate が日付として不正
 */
export const recommendedOrderDate = (
  inspectionItem: Pick<InspectionItem, "execution" | "leadTimeDays" | "bufferDays" | "nextDueDate">,
  vendor: Pick<Vendor, "standardLeadTimeDays"> | null,
): IsoDateString | null => {
  if (inspectionItem.execution !== EXECUTION.EXTERNAL) return null;
  const leadTimeDays = resolveLeadTime(inspectionItem, vendor);
  if (leadTimeDays === null) return null;
  return addDays(inspectionItem.nextDueDate, -(leadTimeDays + inspectionItem.bufferDays));
};
