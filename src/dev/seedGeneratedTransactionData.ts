/**
 * 自動生成機器（seedMasterData の buildGeneratedEquipment）向けの点検校正項目・記録。
 * 全シード機器に最低1件の項目を紐付けるため、生成機器それぞれに項目1件 + 実績記録1件を作る。
 * 乱数不使用（index の剰余で決定）とし、テスト・画面確認の再現性を保つ。
 */

import { buildGeneratedEquipment } from '@/dev/seedMasterData';
import { DEFAULT_BUFFER_DAYS, DEFAULT_NOTICE_DAYS_BEFORE } from '@/domain/constants';
import {
  CYCLE,
  EXECUTION,
  SERVICE_ITEM_TYPE,
  SERVICE_RECORD_RESULT,
  type Equipment,
  type IsoDateString,
  type ServiceItem,
  type ServiceRecord,
} from '@/store/types';
import { addDays } from '@/utils/time';

const GENERATED_CYCLES = [
  { cycle: CYCLE.Y1, days: 365 },
  { cycle: CYCLE.M6, days: 183 },
  { cycle: CYCLE.Y1, days: 365 },
  { cycle: CYCLE.Y2, days: 731 },
] as const;

const GENERATED_ASSIGNEES = [
  { id: 'seed-person-sato', name: '佐藤 由紀子' },
  { id: 'seed-person-suzuki', name: '鈴木 健太' },
  { id: 'seed-person-takahashi', name: '高橋 美咲' },
] as const;

const GENERATED_CALIBRATORS = [
  { id: 'seed-vendor-tokyo', name: '東京計測サービス' },
  { id: 'seed-vendor-osaka', name: '大阪校正センター' },
  { id: 'seed-vendor-both', name: '共立精機' },
] as const;

const generatedServiceItemId = (equipmentId: string): string =>
  equipmentId.replace('seed-equipment-', 'seed-item-generated-');

const buildGeneratedServiceItem = (
  equipment: Equipment,
  index: number,
  today: IsoDateString,
): ServiceItem => {
  const cycleDef = GENERATED_CYCLES[index % GENERATED_CYCLES.length];
  const type = index % 2 === 0 ? SERVICE_ITEM_TYPE.INSPECTION : SERVICE_ITEM_TYPE.CALIBRATION;
  const isExternal = index % 3 === 0;
  // なぜこの式か: 期限を「超過（最大25日前）〜周期上限の手前」に決定的に分散させつつ、
  // lastDoneDate（nextDueDate - 周期日数）が必ず過去日になるよう cycleDef.days - 10 で頭打ちにする。
  const daysUntilDue = Math.min(((index * 29) % (cycleDef.days + 30)) - 25, cycleDef.days - 10);
  const nextDueDate = addDays(today, daysUntilDue) ?? today;
  return {
    id: generatedServiceItemId(equipment.id),
    equipmentId: equipment.id,
    type,
    execution: isExternal ? EXECUTION.EXTERNAL : EXECUTION.INTERNAL,
    name: type === SERVICE_ITEM_TYPE.INSPECTION ? '定期点検' : '定期校正',
    cycle: cycleDef.cycle,
    ...(isExternal
      ? { vendorId: GENERATED_CALIBRATORS[index % GENERATED_CALIBRATORS.length].id }
      : {}),
    personId: GENERATED_ASSIGNEES[index % GENERATED_ASSIGNEES.length].id,
    bufferDays: DEFAULT_BUFFER_DAYS,
    noticeDaysBefore: DEFAULT_NOTICE_DAYS_BEFORE,
    nextDueDate,
    lastDoneDate: addDays(nextDueDate, -cycleDef.days) ?? today,
    isActive: true,
  };
};

export const buildGeneratedServiceItems = (today: IsoDateString): Record<string, ServiceItem> => {
  const serviceItems: Record<string, ServiceItem> = {};
  for (const [index, equipment] of Object.values(buildGeneratedEquipment()).entries()) {
    const serviceItem = buildGeneratedServiceItem(equipment, index, today);
    serviceItems[serviceItem.id] = serviceItem;
  }
  return serviceItems;
};

const generatedDoneBy = (serviceItem: ServiceItem, index: number): string => {
  if (serviceItem.execution === EXECUTION.EXTERNAL) {
    return (
      GENERATED_CALIBRATORS.find((vendor) => vendor.id === serviceItem.vendorId)?.name ??
      GENERATED_CALIBRATORS[0].name
    );
  }
  return GENERATED_ASSIGNEES[index % GENERATED_ASSIGNEES.length].name;
};

export const buildGeneratedRecords = (today: IsoDateString): Record<string, ServiceRecord> => {
  const records: Record<string, ServiceRecord> = {};
  for (const [index, serviceItem] of Object.values(buildGeneratedServiceItems(today)).entries()) {
    const id = serviceItem.id.replace('seed-item-generated-', 'seed-record-generated-');
    records[id] = {
      id,
      serviceItemId: serviceItem.id,
      doneDate: serviceItem.lastDoneDate ?? today,
      doneBy: generatedDoneBy(serviceItem, index),
      result: index % 7 === 3 ? SERVICE_RECORD_RESULT.ADJUSTED : SERVICE_RECORD_RESULT.PASS,
    };
  }
  return records;
};
