/**
 * CSV の直列化・パース(RFC 4180 準拠、D-028)。
 * 区切りはカンマ、引用は `"` 囲み + `""` エスケープ、行末は CRLF。
 * エンティティとの相互変換(列仕様)は features/settings/components/csv/entityCsv.ts が担い、
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

/**
 * 1フィールド + 直後の区切りにマッチする sticky 正規表現。
 * 名前付きグループ `raw` が生フィールド(引用符込み)、`delimiter` が区切り
 * (`,` / 改行 / 終端の空文字列)。
 * 引用フィールドの中身(`"..."`)と非引用フィールドを `raw` 1つのグループにまとめているのは、
 * 2グループに分けると「どちらが undefined か」の判定が必要になり、
 * noUncheckedIndexedAccess を無効化している本プロジェクトでは
 * typescript/no-unnecessary-condition に抵触するため。代わりに `raw.startsWith('"')` で判定する。
 * `(?:[^"]|"")*` は先頭文字で分岐が確定するためバックトラック爆発は起きない。
 */
const FIELD_PATTERN = /(?<raw>"(?:[^"]|"")*"|[^",\r\n][^,\r\n]*|)(?<delimiter>,|\r\n|[\r\n]|$)/uy;

/**
 * CSV 文字列をセル二次元配列へパースする。先頭 BOM は除去し、行末は CRLF / LF / 単独 CR の
 * いずれも受理、末尾の改行は無視する。引用フィールド内のカンマ・改行・`""` を扱う。
 * 不正な引用(閉じ引用の欠落、閉じ引用直後の余分な文字)は例外を投げず null を返す
 * (coding-standards.md §8「例外を投げない」)。
 */
export const parseCsv = (text: string): string[][] | null => {
  const content = text.startsWith(CSV_BOM) ? text.slice(CSV_BOM.length) : text;
  if (content === "") return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let index = 0;
  // 直前の区切りがカンマだった(=行の途中)かどうか。終端直後の空フィールドを拾うため
  // index が content.length に達した後も1回だけループを回す必要がある
  let pending = false;

  while (index < content.length || pending) {
    FIELD_PATTERN.lastIndex = index;
    const match = FIELD_PATTERN.exec(content);
    if (match === null) return null;
    const { raw = "", delimiter = "" } = match.groups ?? {};
    row.push(raw.startsWith('"') ? raw.slice(1, -1).replaceAll('""', '"') : raw);
    index += match[0].length;
    if (delimiter === ",") {
      pending = true;
      continue;
    }
    rows.push(row);
    row = [];
    pending = index < content.length;
  }
  return rows;
};
