/**
 * CSV インポートの行単位検証(§11、D-029 / D-030)。
 * 検証順: ヘッダ一致 → 行ごとに [列数 → セル変換 → zod(store/schema.ts)] →
 * ファイル内ユニーク(id + uniqueKeys) → 外向き参照の存在チェック(現在ストアと突合)。
 * エラーが1件でもあれば取り込み不可(entities = null、D-030)。
 * 行番号はファイル上の行番号(ヘッダ = 1行目、データ先頭 = 行2)。
 */

import { collectFormulaWarnings } from "@/features/settings/components/csv/csvFormulaWarning";
import { REFERENCE_CHECKS } from "@/features/settings/components/csv/csvReferenceChecks";
import {
  CSV_COLUMN_KIND,
  type CsvColumnKind,
  type CsvEntityKind,
  ENTITY_CSV_SPECS,
  type EntityCsvSpec,
  type EntityOf,
  NUMBER_CELL_PATTERN,
} from "@/features/settings/components/csv/entityCsv";
import type { AppState } from "@/store/types";
import { parseCsv } from "@/utils/csv";
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

type CellConversion =
  | { ok: true; value: string | number | boolean | undefined }
  | { ok: false; message: string };

/** セル文字列を列種別に従いフィールド値へ変換する(D-028 の逆変換) */
const convertCell = (cell: string, kind: CsvColumnKind): CellConversion => {
  if (kind === CSV_COLUMN_KIND.STRING) return { ok: true, value: cell };
  if (kind === CSV_COLUMN_KIND.OPTIONAL_STRING) {
    return { ok: true, value: cell === "" ? undefined : cell };
  }
  if (kind === CSV_COLUMN_KIND.BOOLEAN) {
    if (cell === "true") return { ok: true, value: true };
    if (cell === "false") return { ok: true, value: false };
    return { ok: false, message: "true/false のいずれかを指定してください" };
  }
  if (kind === CSV_COLUMN_KIND.OPTIONAL_NUMBER && cell === "") {
    return { ok: true, value: undefined };
  }
  if (!NUMBER_CELL_PATTERN.test(cell)) return { ok: false, message: "数値を指定してください" };
  return { ok: true, value: Number(cell) };
};

const zodIssueDetail = (issue: z.core.$ZodIssue, raw: Record<string, unknown>): string => {
  // 列挙の不正値(例: status が 'broken')。入力値を提示して修正しやすくする
  // (zod の issue は入力値を保持しないため、変換済みの行データから引く)
  if (issue.code === "invalid_value") return `不正値 '${String(raw[String(issue.path[0])])}'`;
  if (issue.code === "invalid_type") {
    return issue.expected === "int" ? "整数を指定してください" : "値の型が不正です";
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
const preflightCsv = <Kind extends CsvEntityKind>(
  spec: EntityCsvSpec<Kind>,
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

/** 1データ行をエンティティへ変換する(列数 → セル変換 → zod)。失敗時はメッセージ一覧 */
const rowToEntity = <Kind extends CsvEntityKind>(
  spec: EntityCsvSpec<Kind>,
  cells: string[],
): { entity: EntityOf<Kind> } | { messages: string[] } => {
  if (cells.length !== spec.columns.length) {
    return { messages: [`列数が不正です(期待${spec.columns.length}・実際${cells.length})`] };
  }
  const raw: Record<string, unknown> = {};
  const messages: string[] = [];
  for (const [columnIndex, column] of spec.columns.entries()) {
    const converted = convertCell(cells[columnIndex], column.kind);
    if (converted.ok) {
      raw[column.key] = converted.value;
    } else {
      messages.push(`${column.key}: ${converted.message}`);
    }
  }
  if (messages.length > 0) return { messages };
  const result = spec.schema.safeParse(raw);
  if (!result.success) {
    return { messages: result.error.issues.map((issue) => formatZodIssue(issue, raw)) };
  }
  return { entity: result.data };
};

/**
 * ファイル内ユニーク制約(id + uniqueKeys)の検証。初出行を `seenValues` に記録し、
 * 重複時は初出行番号付きのメッセージを返す。
 */
const checkUniqueness = <Kind extends CsvEntityKind>(
  entity: EntityOf<Kind>,
  seenValues: Map<string, Map<string, number>>,
  line: number,
): string[] => {
  const messages: string[] = [];
  for (const [key, seen] of seenValues) {
    const value = String((entity as Record<string, unknown>)[key]);
    const firstLine = seen.get(value);
    if (firstLine === undefined) {
      seen.set(value, line);
    } else {
      messages.push(`${key}: 重複しています(行${firstLine}と同じ値)`);
    }
  }
  return messages;
};

/** 1データ行の変換結果(rowToEntity → ユニーク・参照整合)をまとめた判定 */
type RowOutcome<Kind extends CsvEntityKind> =
  | { ok: true; entity: EntityOf<Kind> }
  | { ok: false; messages: string[] };

/** evaluateRow がまとめて受け取る、行ごとに不変な検証コンテキスト(max-params 対策) */
type RowContext<Kind extends CsvEntityKind> = {
  kind: Kind;
  spec: EntityCsvSpec<Kind>;
  seenValues: Map<string, Map<string, number>>;
  state: AppState;
};

/** rowToEntity の結果にファイル内ユニーク・参照整合チェックまで適用する(collectRows のループ本体の分離) */
const evaluateRow = <Kind extends CsvEntityKind>(
  ctx: RowContext<Kind>,
  cells: string[],
  line: number,
): RowOutcome<Kind> => {
  const outcome = rowToEntity(ctx.spec, cells);
  if ("messages" in outcome) return { ok: false, messages: outcome.messages };
  const rowMessages = [
    ...checkUniqueness(outcome.entity, ctx.seenValues, line),
    ...REFERENCE_CHECKS[ctx.kind](outcome.entity, ctx.state),
  ];
  if (rowMessages.length > 0) return { ok: false, messages: rowMessages };
  return { ok: true, entity: outcome.entity };
};

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
  const warnings: ImportRowError[] = [];
  const entities: Record<string, EntityOf<Kind>> = {};
  const seenValues = new Map<string, Map<string, number>>(
    ["id", ...spec.uniqueKeys].map((key) => [key, new Map<string, number>()]),
  );
  const ctx: RowContext<Kind> = { kind, spec, seenValues, state };
  let validCount = 0;
  for (const [dataIndex, cells] of dataRows.entries()) {
    const line = dataIndex + 2;
    if (cells.length === spec.columns.length) {
      warnings.push(...collectFormulaWarnings(spec, cells, line));
    }
    const outcome = evaluateRow(ctx, cells, line);
    if (!outcome.ok) {
      errors.push(...outcome.messages.map((message) => ({ line, message })));
      continue;
    }
    entities[outcome.entity.id] = outcome.entity;
    validCount += 1;
  }
  return { validCount, errors, warnings, entities };
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
  if ("errors" in preflighted) {
    return {
      validCount: 0,
      errorRowCount: 1,
      errors: preflighted.errors,
      entities: null,
      warnings: [],
      warningRowCount: 0,
    };
  }
  const { validCount, errors, warnings, entities } = collectRows(kind, preflighted.dataRows, state);
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
