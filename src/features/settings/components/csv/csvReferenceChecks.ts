/**
 * インポート行の外向き参照(FK)が現在のストアに存在するかを検証する(D-029)。
 * 対象種別自身への参照を持つエンティティは存在しないため、突合先は常に「他エンティティの現在値」。
 * importValidation.ts から分離(max-lines 対策)。
 */

import type { CsvEntityKind, EntityOf } from "@/features/settings/components/csv/entityCsv";
import { type AppState, NOTIFICATION_TARGET_TYPE } from "@/store/types";
import { recordValue } from "@/utils/record";

export const REFERENCE_CHECKS: {
  [Kind in CsvEntityKind]: (entity: EntityOf<Kind>, state: AppState) => string[];
} = {
  equipment: (entity, state) =>
    entity.manufacturerId !== undefined &&
    recordValue(state.vendors, entity.manufacturerId) === undefined
      ? [`manufacturerId: 参照先が存在しません '${entity.manufacturerId}'`]
      : [],
  serviceItems: (entity, state) => {
    const messages: string[] = [];
    if (recordValue(state.equipment, entity.equipmentId) === undefined) {
      messages.push(`equipmentId: 参照先が存在しません '${entity.equipmentId}'`);
    }
    if (
      entity.vendorId !== undefined &&
      recordValue(state.vendors, entity.vendorId) === undefined
    ) {
      messages.push(`vendorId: 参照先が存在しません '${entity.vendorId}'`);
    }
    if (recordValue(state.persons, entity.personId) === undefined) {
      messages.push(`personId: 参照先が存在しません '${entity.personId}'`);
    }
    return messages;
  },
  serviceRecords: (entity, state) => {
    const messages: string[] = [];
    if (recordValue(state.serviceItems, entity.serviceItemId) === undefined) {
      messages.push(`serviceItemId: 参照先が存在しません '${entity.serviceItemId}'`);
    }
    if (
      entity.serviceOrderId !== undefined &&
      recordValue(state.serviceOrders, entity.serviceOrderId) === undefined
    ) {
      messages.push(`serviceOrderId: 参照先が存在しません '${entity.serviceOrderId}'`);
    }
    return messages;
  },
  serviceOrders: (entity, state) => {
    const messages: string[] = [];
    if (recordValue(state.serviceItems, entity.serviceItemId) === undefined) {
      messages.push(`serviceItemId: 参照先が存在しません '${entity.serviceItemId}'`);
    }
    if (recordValue(state.vendors, entity.vendorId) === undefined) {
      messages.push(`vendorId: 参照先が存在しません '${entity.vendorId}'`);
    }
    return messages;
  },
  vendors: () => [],
  persons: () => [],
  notifications: (entity, state) => {
    const messages: string[] = [];
    const targetExists =
      entity.targetType === NOTIFICATION_TARGET_TYPE.SERVICE_ITEM
        ? recordValue(state.serviceItems, entity.targetId) !== undefined
        : recordValue(state.serviceOrders, entity.targetId) !== undefined;
    if (!targetExists) {
      messages.push(`targetId: 参照先が存在しません '${entity.targetId}'`);
    }
    if (recordValue(state.persons, entity.personId) === undefined) {
      messages.push(`personId: 参照先が存在しません '${entity.personId}'`);
    }
    return messages;
  },
};
