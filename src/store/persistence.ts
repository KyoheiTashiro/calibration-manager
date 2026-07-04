/**
 * LocalStorage 読込パイプライン: migrate（バージョン変換）→ merge（検証・サルベージ・結合）
 * （store.md「永続化」）。zustand persist の設定から呼ばれる純関数群で、ストアに依存しない。
 */

import { STORAGE_VERSION } from "@/constants/storage";
import {
  appStateSchema,
  calibrationOrderSchema,
  equipmentSchema,
  inspectionItemSchema,
  inspectionRecordSchema,
  notificationSchema,
  personSchema,
  vendorSchema,
} from "@/store/schema";
import { type AppState, NOTIFICATION_TARGET_TYPE } from "@/store/types";
import { recordValue } from "@/utils/record";
import type { z } from "zod";

export const emptyAppState = (): AppState => ({
  vendors: {},
  persons: {},
  equipment: {},
  inspectionItems: {},
  records: {},
  orders: {},
  notifications: {},
});

/** version N → N+1 のステップ変換。キーは変換元バージョン N */
export type MigrationStep = (persisted: unknown) => unknown;

/** v1 各エントリのフィールド名を変更する。非オブジェクトはそのまま残し merge のサルベージに委ねる */
const renameFieldInRecord = (value: unknown, from: string, to: string): unknown => {
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (typeof entry !== "object" || entry === null || !(from in entry)) return [key, entry];
      const { [from]: renamed, ...rest } = entry as Record<string, unknown>;
      return [key, { ...rest, [to]: renamed }];
    }),
  );
};

/**
 * v1→v2: item→inspectionItem リネーム（D-036）。
 * - 状態キー items → inspectionItems
 * - records / orders の itemId → inspectionItemId
 * - notifications の targetType "item" → "inspectionItem"
 * 比較の "item" は v1 の歴史的リテラル値（現行列挙に存在しない）のため直書き。
 */
export const migrateV1ToV2: MigrationStep = (persisted) => {
  if (typeof persisted !== "object" || persisted === null) return persisted;
  const { items, records, orders, notifications, ...rest } = persisted as Record<string, unknown>;
  const migratedNotifications =
    typeof notifications === "object" && notifications !== null
      ? Object.fromEntries(
          Object.entries(notifications).map(([key, entry]) => {
            if (typeof entry !== "object" || entry === null) return [key, entry];
            const notification = entry as Record<string, unknown>;
            return [
              key,
              notification["targetType"] === "item"
                ? { ...notification, targetType: NOTIFICATION_TARGET_TYPE.INSPECTION_ITEM }
                : notification,
            ];
          }),
        )
      : notifications;
  return {
    ...rest,
    inspectionItems: items,
    records: renameFieldInRecord(records, "itemId", "inspectionItemId"),
    orders: renameFieldInRecord(orders, "itemId", "inspectionItemId"),
    notifications: migratedNotifications,
  };
};

/**
 * 将来のスキーマ変更時は migrateVNToVN+1 を追加してここへ登録し、
 * STORAGE_VERSION をインクリメントする（store.md「migrate」）。
 */
export const MIGRATIONS: Record<number, MigrationStep> = { 1: migrateV1ToV2 };

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
    const step = migrations[version];
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
  vendors: salvageRecords(persisted["vendors"], vendorSchema),
  persons: salvageRecords(persisted["persons"], personSchema),
  equipment: salvageRecords(persisted["equipment"], equipmentSchema),
  inspectionItems: salvageRecords(persisted["inspectionItems"], inspectionItemSchema),
  records: salvageRecords(persisted["records"], inspectionRecordSchema),
  orders: salvageRecords(persisted["orders"], calibrationOrderSchema),
  notifications: salvageRecords(persisted["notifications"], notificationSchema),
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
      return notification.targetType === NOTIFICATION_TARGET_TYPE.INSPECTION_ITEM
        ? recordValue(state.inspectionItems, notification.targetId) !== undefined
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
  if (typeof persisted === "object" && persisted !== null) {
    return sanitizeAppState(salvageAppStatePerRecord(persisted as Record<string, unknown>));
  }
  return emptyAppState();
};
