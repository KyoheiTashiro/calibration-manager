/**
 * LocalStorage 永続化の定数。
 * キー・バージョンは zustand persist の `name` / `version` に渡す。
 */

export const STORAGE_KEY = "calibration-manager:v1";

/**
 * スキーマバージョン。初回スキーマ=1、v2=item→inspectionItem リネーム（persistence.ts
 * migrateV1ToV2）、v3=inspectionItem→serviceItem リネーム（同 migrateV2ToV3、D-045）、
 * v4=order→serviceOrder リネーム（同 migrateV3ToV4、D-046）、
 * v5=record→serviceRecord リネーム（同 migrateV4ToV5、D-050）。
 * 将来スキーマを変更する際は migrate ステップを追加した上でこの値をインクリメントする。
 */
export const STORAGE_VERSION = 5;
