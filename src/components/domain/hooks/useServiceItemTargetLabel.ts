import { useAppStore } from '@/store/useAppStore';
import { recordValue } from '@/utils/record';

/**
 * モーダル上部「対象」欄の表示文言(管理番号 機器名 / 項目名)。
 * ServiceOrderModal / ServiceRecordModal で共用する。項目または機器が見つからなければ代替文言を返す。
 */
export const useServiceItemTargetLabel = (serviceItemId: string): string => {
  const serviceItem = useAppStore((state) => recordValue(state.serviceItems, serviceItemId));
  const equipment = useAppStore((state) =>
    serviceItem ? recordValue(state.equipment, serviceItem.equipmentId) : undefined,
  );
  return serviceItem && equipment
    ? `対象:${equipment.managementNo} ${equipment.name} / ${serviceItem.name}`
    : '対象:(項目情報が見つかりません)';
};
