/**
 * LocalStorage 永続化の定数（docs/architecture/store.md「永続化」）。
 * キー・バージョンは zustand persist の `name` / `version` に渡す。
 */

/** LocalStorage キー（tech-stack.md「状態管理・永続化の方針」） */
export const STORAGE_KEY = "calibration-manager:v1";

/**
 * スキーマバージョン。初回スキーマのため 1 から開始する。
 * 将来スキーマを変更する際は migrate ステップ（store.md「migrate」）を追加した上で
 * この値をインクリメントする。
 */
export const STORAGE_VERSION = 1;
