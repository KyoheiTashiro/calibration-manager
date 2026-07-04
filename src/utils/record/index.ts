/**
 * Record<string, T> の安全な参照。
 * なぜ必要か: tsconfig の noUncheckedIndexedAccess は意図的に無効（coding-standards.md §10）のため、
 * `record[key]` は不在時も型上 `T` になり、防御的な `?? null` が
 * typescript/no-unnecessary-condition に「不要な条件」と誤検知される。
 * このヘルパを介すと戻り値が `T | undefined` になり、不在の可能性が型に現れる。
 */
export const recordValue = <Value>(record: Record<string, Value>, key: string): Value | undefined =>
  Object.hasOwn(record, key) ? record[key] : undefined;
