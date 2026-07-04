/**
 * LocalStorage 読込パイプライン: migrate（バージョン変換）→ merge（検証・サルベージ・結合）
 * （store.md「永続化」）。zustand persist の設定から呼ばれる純関数群で、ストアに依存しない。
 */

import { STORAGE_VERSION } from "@/constants/storage";
import {
  appStateSchema,
  serviceOrderSchema,
  equipmentSchema,
  serviceItemSchema,
  serviceRecordSchema,
  notificationSchema,
  personSchema,
  vendorSchema,
} from "@/store/schema";
import { type AppState, NOTIFICATION_TARGET_TYPE } from "@/store/types";
import { isRecord, recordValue } from "@/utils/record";
import type { z } from "zod";

export const emptyAppState = (): AppState => ({
  vendors: {},
  persons: {},
  equipment: {},
  serviceItems: {},
  records: {},
  orders: {},
  notifications: {},
});

/** version N → N+1 のステップ変換。キーは変換元バージョン N */
export type MigrationStep = (persisted: unknown) => unknown;

/** v1 各エントリのフィールド名を変更する。非オブジェクトはそのまま残し merge のサルベージに委ねる */
const renameFieldInRecord = (value: unknown, from: string, to: string): unknown => {
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (!isRecord(entry) || !(from in entry)) return [key, entry];
      const { [from]: renamed, ...rest } = entry;
      return [key, { ...rest, [to]: renamed }];
    }),
  );
};

/** notifications の targetType を from → to へ変更する。非オブジェクトはそのまま残す */
const renameNotificationTargetType = (
  notifications: unknown,
  from: string,
  to: string,
): unknown => {
  if (!isRecord(notifications)) return notifications;
  return Object.fromEntries(
    Object.entries(notifications).map(([key, entry]) => {
      if (!isRecord(entry)) return [key, entry];
      return [key, entry.targetType === from ? { ...entry, targetType: to } : entry];
    }),
  );
};

/**
 * v1→v2: item→inspectionItem リネーム（D-036）。
 * - 状態キー items → inspectionItems
 * - records / orders の itemId → inspectionItemId
 * - notifications の targetType "item" → "inspectionItem"
 * ステップ変換は「v2 当時の形式」を出力する（最終形式は後続ステップが作る）ため、
 * "item" / "inspectionItem" 等はいずれも歴史的リテラル値（現行列挙に存在しない）で直書き。
 */
export const migrateV1ToV2: MigrationStep = (persisted) => {
  if (!isRecord(persisted)) return persisted;
  const { items, records, orders, notifications, ...rest } = persisted;
  return {
    ...rest,
    inspectionItems: items,
    records: renameFieldInRecord(records, "itemId", "inspectionItemId"),
    orders: renameFieldInRecord(orders, "itemId", "inspectionItemId"),
    notifications: renameNotificationTargetType(notifications, "item", "inspectionItem"),
  };
};

/**
 * v2→v3: inspectionItem→serviceItem リネーム（D-045。Inspection 系と Calibration 系が
 * 混在していたエンティティ英語名を Service 系へ統一）。
 * - 状態キー inspectionItems → serviceItems
 * - records / orders の inspectionItemId → serviceItemId
 * - notifications の targetType "inspectionItem" → "serviceItem"
 * "inspectionItem" は v2 の歴史的リテラル値のため直書き。
 */
export const migrateV2ToV3: MigrationStep = (persisted) => {
  if (!isRecord(persisted)) return persisted;
  const { inspectionItems, records, orders, notifications, ...rest } = persisted;
  return {
    ...rest,
    serviceItems: inspectionItems,
    records: renameFieldInRecord(records, "inspectionItemId", "serviceItemId"),
    orders: renameFieldInRecord(orders, "inspectionItemId", "serviceItemId"),
    notifications: renameNotificationTargetType(
      notifications,
      "inspectionItem",
      NOTIFICATION_TARGET_TYPE.SERVICE_ITEM,
    ),
  };
};

/**
 * 将来のスキーマ変更時は migrateVNToVN+1 を追加してここへ登録し、
 * STORAGE_VERSION をインクリメントする（store.md「migrate」）。
 */
export const MIGRATIONS: Record<number, MigrationStep> = { 1: migrateV1ToV2, 2: migrateV2ToV3 };

/**
 * fromVersion から STORAGE_VERSION までステップ変換を順に適用する。
 * @param migrations 通常は MIGRATIONS。テストでステップ適用の機構を検証するために注入可能にしている
 */
export const migratePersistedState = (
  persisted: unknown,
  fromVersion: number,
  migrations: Record<number, MigrationStep> = MIGRATIONS,
): unknown => {
  let state = persisted;
  for (let version = fromVersion; version < STORAGE_VERSION; version += 1) {
    // Record<number, MigrationStep> の bracket access は型上 MigrationStep になるが、
    // 実際には未登録バージョンキーで undefined になり得るため hasOwn で存在確認してから読む
    // （recordValue と同じ考え方。キー型が number のためヘルパは使わずここに書く）
    const step = Object.hasOwn(migrations, version) ? migrations[version] : undefined;
    // 未登録バージョンはそのまま通し、後段 merge のサルベージに委ねる（例外を投げない）
    if (step !== undefined) state = step(state);
  }
  return state;
};

/** レコード単位サルベージ: パースに成功したエントリのみ残す（store.md「merge」段階2） */
const salvageRecords = <Entity>(
  value: unknown,
  schema: z.ZodType<Entity>,
): Record<string, Entity> => {
  if (typeof value !== "object" || value === null) return {};
  const salvaged: Record<string, Entity> = {};
  for (const [key, entry] of Object.entries(value)) {
    const parsed = schema.safeParse(entry);
    if (parsed.success) salvaged[key] = parsed.data;
  }
  return salvaged;
};

const salvageAppStatePerRecord = (persisted: Record<string, unknown>): AppState => ({
  vendors: salvageRecords(persisted.vendors, vendorSchema),
  persons: salvageRecords(persisted.persons, personSchema),
  equipment: salvageRecords(persisted.equipment, equipmentSchema),
  serviceItems: salvageRecords(persisted.serviceItems, serviceItemSchema),
  records: salvageRecords(persisted.records, serviceRecordSchema),
  orders: salvageRecords(persisted.orders, serviceOrderSchema),
  notifications: salvageRecords(persisted.notifications, notificationSchema),
});

/**
 * 参照整合の修復（D-003）。
 * ユーザー入力データは dangling FK があっても保持し（表示側が「参照先なし」として扱う）、
 * 再生成可能な導出データである Notification のみ、参照先（target / person）を
 * 失ったものを除去する。
 */
export const sanitizeAppState = (state: AppState): AppState => {
  const notifications = Object.fromEntries(
    Object.entries(state.notifications).filter(([, notification]) => {
      if (recordValue(state.persons, notification.personId) === undefined) return false;
      return notification.targetType === NOTIFICATION_TARGET_TYPE.SERVICE_ITEM
        ? recordValue(state.serviceItems, notification.targetId) !== undefined
        : recordValue(state.orders, notification.targetId) !== undefined;
    }),
  );
  return { ...state, notifications };
};

/**
 * merge の3段サルベージ（store.md「merge」）:
 * 1. ハッピーパス: 全体 safeParse 成功ならそのまま採用
 * 2. 部分破損: オブジェクトではあるが全体パース失敗 → レコード単位で成功分のみ救済
 * 3. 最終手段: オブジェクトですらない → 初期状態
 * いずれも最後に sanitizeAppState で参照整合を修復する。
 */
export const salvagePersistedState = (persisted: unknown): AppState => {
  const whole = appStateSchema.safeParse(persisted);
  if (whole.success) return sanitizeAppState(whole.data);
  if (isRecord(persisted)) return sanitizeAppState(salvageAppStatePerRecord(persisted));
  return emptyAppState();
};
