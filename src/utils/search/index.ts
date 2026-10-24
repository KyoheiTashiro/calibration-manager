/**
 * 一覧画面のテキスト検索（部分一致・大文字小文字無視）。未設定フィールドは空文字として扱う。
 * @param normalizedQuery trim + toLowerCase 済みの検索語。空文字なら常に一致
 */
export const matchesSearchText = (
  fields: readonly (string | undefined)[],
  normalizedQuery: string,
): boolean => {
  if (normalizedQuery === '') return true;
  return fields
    .map((field) => field ?? '')
    .join('\n')
    .toLowerCase()
    .includes(normalizedQuery);
};
