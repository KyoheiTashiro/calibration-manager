/**
 * CSV の直列化・パース(RFC 4180 準拠、D-028)。
 * 区切りはカンマ、引用は `"` 囲み + `""` エスケープ、行末は CRLF。
 * エンティティとの相互変換(列仕様)は features/settings/entityCsv.ts が担い、
 * ここは文字列 ⇔ セル二次元配列の変換のみを扱う。
 */

/** UTF-8 BOM。エクスポート時にファイル先頭へ付与する(Excel 互換、domain-model.md §5) */
export const CSV_BOM = "\u{FEFF}";

/** 引用が必要な文字(カンマ・引用符・改行)を含むかの判定用 */
const NEEDS_QUOTING_PATTERN = /[",\r\n]/u;

/** セル1つを RFC 4180 のフィールドへ整形する(必要時のみ引用) */
const serializeCsvField = (value: string): string =>
  NEEDS_QUOTING_PATTERN.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** セル二次元配列を CSV 文字列へ直列化する(各行 CRLF 終端。BOM は付与しない) */
export const serializeCsv = (rows: readonly (readonly string[])[]): string =>
  rows.map((row) => `${row.map((cell) => serializeCsvField(cell)).join(",")}\r\n`).join("");

/** parseCsv の走査状態。ヘルパ関数が直接書き換える(1回のパース内でのみ生存) */
type CsvParseState = {
  content: string;
  index: number;
  field: string;
  inQuotes: boolean;
  row: string[];
  rows: string[][];
};

const endField = (state: CsvParseState): void => {
  state.row.push(state.field);
  state.field = "";
};

const endRow = (state: CsvParseState): void => {
  endField(state);
  state.rows.push(state.row);
  state.row = [];
};

/** 引用フィールド内の1文字を消費する。不正な引用(閉じ引用直後の余分な文字)は false */
const consumeQuotedChar = (state: CsvParseState): boolean => {
  const char = state.content[state.index];
  if (char !== '"') {
    state.field += char;
    state.index += 1;
    return true;
  }
  if (state.content[state.index + 1] === '"') {
    // `""` はエスケープされた引用符1文字
    state.field += '"';
    state.index += 2;
    return true;
  }
  // 閉じ引用の直後はカンマ・改行・終端のみ許す(`"a"b` は不正)
  const next = state.content[state.index + 1];
  if (next !== undefined && next !== "," && next !== "\r" && next !== "\n") return false;
  state.inQuotes = false;
  state.index += 1;
  return true;
};

/** 引用フィールド外の1文字を消費する(引用開始・区切り・改行・通常文字) */
const consumeUnquotedChar = (state: CsvParseState): void => {
  const char = state.content[state.index];
  if (char === '"' && state.field === "") {
    state.inQuotes = true;
    state.index += 1;
    return;
  }
  if (char === ",") {
    endField(state);
    state.index += 1;
    return;
  }
  if (char === "\r" || char === "\n") {
    endRow(state);
    state.index += char === "\r" && state.content[state.index + 1] === "\n" ? 2 : 1;
    return;
  }
  state.field += char;
  state.index += 1;
};

/**
 * CSV 文字列をセル二次元配列へパースする。先頭 BOM は除去し、行末は CRLF / LF の両方を受理、
 * 末尾の改行は無視する。引用フィールド内のカンマ・改行・`""` を扱う。
 * 不正な引用(閉じ引用の欠落、閉じ引用直後の余分な文字)は例外を投げず null を返す
 * (coding-standards.md §8「例外を投げない」)。
 */
export const parseCsv = (text: string): string[][] | null => {
  const content = text.startsWith(CSV_BOM) ? text.slice(CSV_BOM.length) : text;
  if (content === "") return [];
  const state: CsvParseState = { content, index: 0, field: "", inQuotes: false, row: [], rows: [] };
  while (state.index < state.content.length) {
    if (state.inQuotes) {
      if (!consumeQuotedChar(state)) return null;
    } else {
      consumeUnquotedChar(state);
    }
  }
  if (state.inQuotes) return null;
  // 末尾が改行で終わらない場合のみ最終行が確定していない
  if (state.field !== "" || state.row.length > 0) endRow(state);
  return state.rows;
};
