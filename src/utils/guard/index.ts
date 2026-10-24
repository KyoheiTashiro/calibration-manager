/**
 * value が values のいずれかと一致するかの型ガード。
 * なぜ必要か: <select> の onChange 値や URL クエリは型上ただの string のため、
 * as const 列挙の実在値かを検証してから as なしで union 型へ絞り込む。
 */
export const isOneOf = <Value>(value: unknown, values: readonly Value[]): value is Value =>
  values.some((candidate) => candidate === value);
