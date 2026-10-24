/**
 * なぜラッパーを挟むか: 生成方法を1箇所に固定し、テストでの差し替え・将来の変更を容易にするため。
 */
export const createId = (): string => crypto.randomUUID();
