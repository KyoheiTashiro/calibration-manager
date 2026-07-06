/**
 * Record<string, T> の安全な参照。
 * なぜ必要か: tsconfig の noUncheckedIndexedAccess は意図的に無効なため、
 * `record[key]` は不在時も型上 `T` になり、防御的な `?? null` が
 * typescript/no-unnecessary-condition に「不要な条件」と誤検知される。
 * このヘルパを介すと戻り値が `T | undefined` になり、不在の可能性が型に現れる。
 */
export const recordValue = <Value>(record: Record<string, Value>, key: string): Value | undefined =>
  Object.hasOwn(record, key) ? record[key] : undefined;

/**
 * unknown 値がプレーンオブジェクト(null を除く object 型)かどうかの型ガード。
 * なぜ必要か: `typeof value === "object" && value !== null` で narrowing しても
 * TypeScript は `object` 型までしか絞れず、`Record<string, unknown>` としてのプロパティアクセスには
 * `as` アサーションが必要になり typescript/no-unsafe-type-assertion に抵触する。
 * このヘルパを型ガードとして使うと戻り値が `Record<string, unknown>` に narrowing される。
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
