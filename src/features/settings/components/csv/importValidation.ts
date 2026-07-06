/**
 * CSV インポートの行単位検証(§11、D-029 / D-030 / D-053)。
 * 検証順: ヘッダ一致 → 行ごとに [列数 → セル変換 + zod(store/schema.ts)] →
 * ファイル内ユニーク(id + uniqueKeys) → 外向き参照の存在チェック(現在ストアと突合)。
 * セル変換はベストエフォート(変換できないセルは生文字列のまま)で、型不一致の検出と
 * 報告は zod の invalid_type に一本化し、日本語メッセージへ整形する。
 * 数式インジェクション様セル(D-053)は警告のみで取り込みを妨げない。
 * エラーが1件でもあれば取り込み不可(entities = null、D-030)。
 * 行番号はファイル上の行番号(ヘッダ = 1行目、データ先頭 = 行2)。
 */

import {
  CSV_COLUMN_TYPE,
  type CsvColumn,
  type CsvEntityKind,
  ENTITY_CSV_SPECS,
  type EntityCsvSpec,
  type EntityOf,
  NUMBER_CELL_PATTERN,
} from "@/features/settings/components/csv/entityCsv";
import type { AppState } from "@/store/types";
import { parseCsv } from "@/utils/csv";
import { recordValue } from "@/utils/record";
import type { z } from "zod";

export type ImportRowError = {
  /** ファイル上の行番号(ヘッダ=1)。ファイル全体のエラーは 1 */
  line: number;
  message: string;
};

export type ImportValidationResult<Kind extends CsvEntityKind> = {
  /** 取り込み可能な行数(プレビューの「✓ N行 取り込み可」用) */
  validCount: number;
  /** エラーを含む行数(プレビューの「✗ N行 エラー」用) */
  errorRowCount: number;
  /** エラー一覧(行番号順)。空ならインポート確定可能 */
  errors: ImportRowError[];
  /** エラー0件のときのみ非 null。replaceEntities へそのまま渡せる Record(D-029) */
  entities: AppState[Kind] | null;
  /** 数式インジェクション警告(D-053)。取り込みは妨げない */
  warnings: ImportRowError[];
  /** 警告を含む行数(プレビューの「⚠ N行 警告」用) */
  warningRowCount: number;
};

/**
 * セル文字列を列種別に従いフィールド値へ変換する(D-028 の逆変換)。
 * 数値・boolean として解釈できないセルは生文字列のまま返し、
 * エラー検出・報告は後段の zod(invalid_type)に委ねる。
 */
const cellToValue = <Entity>(cell: string, column: CsvColumn<Entity>): unknown => {
  if (cell === "" && column.optional) return undefined;
  if (column.type === CSV_COLUMN_TYPE.NUMBER && NUMBER_CELL_PATTERN.test(cell)) {
    return Number(cell);
  }
  if (column.type === CSV_COLUMN_TYPE.BOOLEAN && (cell === "true" || cell === "false")) {
    return cell === "true";
  }
  return cell;
};

/** invalid_type の expected 別メッセージ(セル変換をベストエフォートにした分の日本語化) */
const INVALID_TYPE_MESSAGES: Record<string, string> = {
  int: "整数を指定してください",
  number: "数値を指定してください",
  boolean: "true/false のいずれかを指定してください",
};

const zodIssueDetail = (issue: z.core.$ZodIssue, raw: Record<string, unknown>): string => {
  // 列挙の不正値(例: status が 'broken')。入力値を提示して修正しやすくする
  // (zod の issue は入力値を保持しないため、変換済みの行データから引く)
  if (issue.code === "invalid_value") return `不正値 '${String(raw[String(issue.path[0])])}'`;
  if (issue.code === "invalid_type") {
    return recordValue(INVALID_TYPE_MESSAGES, issue.expected) ?? "値の型が不正です";
  }
  if (issue.code === "too_small") {
    return issue.origin === "string" ? "必須です" : "0以上の値を指定してください";
  }
  // custom(日付形式・external時vendorId必須)は schema.ts 側の日本語メッセージをそのまま使う
  return issue.message;
};

/** zod の issue を「列名: 内容」の日本語1行メッセージへ整形する(§11「エラー内容」) */
const formatZodIssue = (issue: z.core.$ZodIssue, raw: Record<string, unknown>): string => {
  const path = issue.path.join(".");
  const detail = zodIssueDetail(issue, raw);
  return path === "" ? detail : `${path}: ${detail}`;
};

/** パースとヘッダ検証。データ行に進めない場合はファイル全体エラー(行1)を返す */
const preflightCsv = <Entity>(
  spec: EntityCsvSpec<Entity>,
  csvText: string,
): { dataRows: string[][] } | { errors: ImportRowError[] } => {
  const parsed = parseCsv(csvText);
  if (parsed === null) {
    return {
      errors: [{ line: 1, message: "CSVとして解釈できません(引用符の対応を確認してください)" }],
    };
  }
  const [header, ...dataRows] = parsed;
  const expectedHeader = spec.columns.map((column) => column.key).join(",");
  // なぜ parsed.length === 0 を先にみるか: 空文字列は parseCsv が [] を返すため、
  // 分割代入の header は実行時に undefined になり得る。noUncheckedIndexedAccess を
  // 無効化しているため型上は string[] だが、header.join を呼ぶ前にこの分岐で弾く。
  if (parsed.length === 0 || header.join(",") !== expectedHeader) {
    return { errors: [{ line: 1, message: `ヘッダが不正です(${spec.label}のCSVではありません)` }] };
  }
  return { dataRows };
};

/** Excel等が数式として解釈し得るセル先頭文字(CSVインジェクション、D-053) */
const FORMULA_LIKE_PATTERN = /^[=+\-@\t\r]/u;

/** 数式として解釈され得るセルの警告(D-053)。正当な負数(`-20`等)と列数不正行(呼び出し側で除外)は対象外 */
const collectFormulaWarnings = <Entity>(
  spec: EntityCsvSpec<Entity>,
  cells: string[],
  line: number,
): ImportRowError[] => {
  const warnings: ImportRowError[] = [];
  for (const [columnIndex, column] of spec.columns.entries()) {
    if (column.type !== CSV_COLUMN_TYPE.STRING) continue;
    const cell = cells[columnIndex];
    if (FORMULA_LIKE_PATTERN.test(cell) && !NUMBER_CELL_PATTERN.test(cell)) {
      warnings.push({
        line,
        message: `${column.key}: 数式として解釈され得る値です(Excel等で開く際は注意)`,
      });
    }
  }
  return warnings;
};

/** 1データ行をエンティティへ変換する(列数 → セル変換 + zod)。失敗時はメッセージ一覧 */
const rowToEntity = <Entity>(
  spec: EntityCsvSpec<Entity>,
  cells: string[],
): { entity: Entity } | { messages: string[] } => {
  if (cells.length !== spec.columns.length) {
    return { messages: [`列数が不正です(期待${spec.columns.length}・実際${cells.length})`] };
  }
  const raw: Record<string, unknown> = Object.fromEntries(
    spec.columns.map((column, columnIndex) => [
      column.key,
      cellToValue(cells[columnIndex], column),
    ]),
  );
  const result = spec.schema.safeParse(raw);
  if (!result.success) {
    return { messages: result.error.issues.map((issue) => formatZodIssue(issue, raw)) };
  }
  return { entity: result.data };
};

/**
 * ファイル内ユニーク制約(id + uniqueKeys)の検証。`seen` のキーは「列名 + NUL + 値」で、
 * 初出の行番号を記録し、重複時は初出行番号付きのメッセージを返す。
 */
const checkUniqueness = (
  entity: Record<string, unknown>,
  keys: readonly string[],
  seen: Map<string, number>,
  line: number,
): string[] =>
  keys.flatMap((key) => {
    const seenKey = `${key}\u{0}${String(entity[key])}`;
    const firstLine = seen.get(seenKey);
    if (firstLine === undefined) {
      seen.set(seenKey, line);
      return [];
    }
    return [`${key}: 重複しています(行${firstLine}と同じ値)`];
  });

/** spec.references に基づき外向き参照(FK)の存在を現在のストアと突合する(D-029)。値が未設定(optional FK)の行は対象外 */
const referenceErrors = <Entity>(
  spec: EntityCsvSpec<Entity>,
  entity: Entity,
  state: AppState,
): string[] =>
  spec.references.flatMap((ref) => {
    const value = entity[ref.key];
    if (typeof value !== "string") return [];
    const kind = typeof ref.target === "function" ? ref.target(entity) : ref.target;
    // state[kind] は AppState[CsvEntityKind](7種の Record の union)で、recordValue の
    // Value をその union へ単一の型として推論できない(union 引数から単一候補への推論限界)。
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- 上記推論限界の回避。実体は Record<string, unknown>
    const exists = recordValue(state[kind] as Record<string, unknown>, value) !== undefined;
    return exists ? [] : [`${ref.key}: 参照先が存在しません '${value}'`];
  });

/** 全データ行を検証し、取り込み可能行の Record とエラー・警告を収集する */
const collectRows = <Kind extends CsvEntityKind>(
  kind: Kind,
  dataRows: string[][],
  state: AppState,
): {
  validCount: number;
  errors: ImportRowError[];
  warnings: ImportRowError[];
  entities: Record<string, EntityOf<Kind>>;
} => {
  const spec = ENTITY_CSV_SPECS[kind];
  const errors: ImportRowError[] = [];
  const entities: Record<string, EntityOf<Kind>> = {};
  const uniqueKeys = ["id", ...spec.uniqueKeys];
  const seen = new Map<string, number>();
  // 警告は列数の正しい行のみ対象(列数不正はエラー側で報告済みのため、D-053)
  const warnings = dataRows.flatMap((cells, dataIndex) =>
    cells.length === spec.columns.length ? collectFormulaWarnings(spec, cells, dataIndex + 2) : [],
  );
  for (const [dataIndex, cells] of dataRows.entries()) {
    const line = dataIndex + 2;
    const outcome = rowToEntity(spec, cells);
    if ("messages" in outcome) {
      errors.push(...outcome.messages.map((message) => ({ line, message })));
      continue;
    }
    const rowMessages = [
      ...checkUniqueness(outcome.entity, uniqueKeys, seen, line),
      ...referenceErrors(spec, outcome.entity, state),
    ];
    if (rowMessages.length > 0) {
      errors.push(...rowMessages.map((message) => ({ line, message })));
      continue;
    }
    entities[outcome.entity.id] = outcome.entity;
  }
  // 有効行は必ず一意な id を1つ登録する(id 重複はエラー)ため、件数は entities のキー数と一致
  return { validCount: Object.keys(entities).length, errors, warnings, entities };
};

/**
 * CSV テキストを検証し、取り込み可能なら置換用の Record を返す(§11、D-029 / D-030)。
 * `state` は参照整合の突合先(現在のストアのスナップショット)。
 */
export const validateEntityCsv = <Kind extends CsvEntityKind>(
  kind: Kind,
  csvText: string,
  state: AppState,
): ImportValidationResult<Kind> => {
  const preflighted = preflightCsv(ENTITY_CSV_SPECS[kind], csvText);
  const { validCount, errors, warnings, entities } =
    "errors" in preflighted
      ? { validCount: 0, errors: preflighted.errors, warnings: [], entities: {} }
      : collectRows(kind, preflighted.dataRows, state);
  return {
    validCount,
    errorRowCount: new Set(errors.map((error) => error.line)).size,
    errors,
    // Kind が未解決ジェネリックのため Record<string, EntityOf<Kind>> と AppState[Kind] の
    // 同値性を TS は証明できない(correlated union 制限)。具体化された各 Kind では構造的に一致する。
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- 上記 correlated union 制限のため
    entities: errors.length === 0 ? (entities as AppState[Kind]) : null,
    warnings,
    warningRowCount: new Set(warnings.map((warning) => warning.line)).size,
  };
};
