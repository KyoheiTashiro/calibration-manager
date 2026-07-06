import {
  type CsvEntityKind,
  ENTITY_CSV_SPECS,
  type EntityCsvSpec,
  type EntityOf,
  NUMBER_CELL_PATTERN,
} from "@/features/settings/components/csv/entityCsv";
import type { AppState } from "@/store/types";
import { parseCsv } from "@/utils/csv";
import { recordValue } from "@/utils/record";
import { z } from "zod";

export type ImportRowError = {
  /** ファイル上の行番号(ヘッダ=1)。ファイル全体のエラーは 1 */
  line: number;
  message: string;
};

export type ImportValidationResult<Kind extends CsvEntityKind> = {
  /** 取り込み可能な行数(プレビューの「✓ N行 取り込み可」用) */
  validCount: number;
  /** エラー一覧(行番号順)。空ならインポート確定可能。エラー行数は行番号の重複排除で導出する */
  errors: ImportRowError[];
  /** エラー0件のときのみ非 null。replaceEntities へそのまま渡せる Record(D-029) */
  entities: AppState[Kind] | null;
  /** 数式インジェクション警告(D-053)。取り込みは妨げない。警告行数は errors 同様に導出する */
  warnings: ImportRowError[];
};

/** 数値・boolean として解釈できないセルは生文字列のまま返し、エラー検出・報告は後段の zod(invalid_type)に委ねる */
const cellToValue = (cell: string, field: z.ZodType): unknown => {
  const optional = field instanceof z.ZodOptional;
  if (cell === "" && optional) return undefined;
  const inner = optional ? field.unwrap() : field;
  if (inner instanceof z.ZodNumber && NUMBER_CELL_PATTERN.test(cell)) return Number(cell);
  if (inner instanceof z.ZodBoolean && (cell === "true" || cell === "false")) {
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

const zodIssueDetail = (issue: z.core.$ZodIssue): string => {
  if (issue.code === "invalid_value") return `不正値 '${String(issue.input)}'`;
  if (issue.code === "invalid_type") {
    return recordValue(INVALID_TYPE_MESSAGES, issue.expected) ?? "値の型が不正です";
  }
  if (issue.code === "too_small") {
    return issue.origin === "string" ? "必須です" : "0以上の値を指定してください";
  }
  // custom(日付形式・external時vendorId必須)は schema.ts 側の日本語メッセージをそのまま使う
  return issue.message;
};

const formatZodIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.join(".");
  const detail = zodIssueDetail(issue);
  return path === "" ? detail : `${path}: ${detail}`;
};

/** Excel等が数式として解釈し得るセル先頭文字(CSVインジェクション、D-053) */
const FORMULA_LIKE_PATTERN = /^[=+\-@\t\r]/u;

const isStringField = (field: z.ZodType): boolean => {
  const inner = field instanceof z.ZodOptional ? field.unwrap() : field;
  return !(inner instanceof z.ZodNumber || inner instanceof z.ZodBoolean);
};

/** 数式として解釈され得るセルの警告(D-053)。正当な負数(`-20`等)は対象外 */
const formulaWarnings = <Entity>(
  spec: EntityCsvSpec<Entity>,
  cells: string[],
  line: number,
): ImportRowError[] =>
  Object.entries(spec.shape).flatMap(([key, field], columnIndex) => {
    const cell = cells[columnIndex];
    if (
      !isStringField(field) ||
      !FORMULA_LIKE_PATTERN.test(cell) ||
      NUMBER_CELL_PATTERN.test(cell)
    ) {
      return [];
    }
    return [{ line, message: `${key}: 数式として解釈され得る値です(Excel等で開く際は注意)` }];
  });

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

/** zod を通過した行は参照エラーがあっても `seen` へ登録する(同じ id 重複は後続行で必ず報告するため) */
const validateRow = <Kind extends CsvEntityKind>(
  spec: EntityCsvSpec<EntityOf<Kind>>,
  cells: string[],
  seen: Map<string, number>,
  state: AppState,
  line: number,
): { entity: EntityOf<Kind> } | { messages: string[] } => {
  const raw: Record<string, unknown> = Object.fromEntries(
    Object.entries(spec.shape).map(([key, field], columnIndex) => [
      key,
      cellToValue(cells[columnIndex], field),
    ]),
  );
  const result = spec.schema.safeParse(raw, { reportInput: true });
  if (!result.success) {
    return { messages: result.error.issues.map((issue) => formatZodIssue(issue)) };
  }
  const messages = [
    ...checkUniqueness(result.data, ["id", ...spec.uniqueKeys], seen, line),
    ...referenceErrors(spec, result.data, state),
  ];
  return messages.length > 0 ? { messages } : { entity: result.data };
};

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
  const columnCount = Object.keys(spec.shape).length;
  const errors: ImportRowError[] = [];
  const warnings: ImportRowError[] = [];
  const entities: Record<string, EntityOf<Kind>> = {};
  const seen = new Map<string, number>();
  for (const [dataIndex, cells] of dataRows.entries()) {
    const line = dataIndex + 2;
    if (cells.length !== columnCount) {
      errors.push({ line, message: `列数が不正です(期待${columnCount}・実際${cells.length})` });
      continue;
    }
    // 警告は列数の正しい行のみ対象(列数不正はエラー側で報告済み、D-053)。zod の成否とは独立に収集する
    warnings.push(...formulaWarnings(spec, cells, line));
    const outcome = validateRow(spec, cells, seen, state, line);
    if ("messages" in outcome) {
      errors.push(...outcome.messages.map((message) => ({ line, message })));
    } else {
      entities[outcome.entity.id] = outcome.entity;
    }
  }
  // 有効行は必ず一意な id を1つ登録する(id 重複はエラー)ため、件数は entities のキー数と一致
  return { validCount: Object.keys(entities).length, errors, warnings, entities };
};

const fileError = <Kind extends CsvEntityKind>(message: string): ImportValidationResult<Kind> => ({
  validCount: 0,
  errors: [{ line: 1, message }],
  entities: null,
  warnings: [],
});

export const validateEntityCsv = <Kind extends CsvEntityKind>(
  kind: Kind,
  csvText: string,
  state: AppState,
): ImportValidationResult<Kind> => {
  const spec = ENTITY_CSV_SPECS[kind];
  const parsed = parseCsv(csvText);
  if (parsed === null) {
    return fileError("CSVとして解釈できません(引用符の対応を確認してください)");
  }
  const [header, ...dataRows] = parsed;
  // なぜ parsed.length === 0 を先にみるか: 空文字列は parseCsv が [] を返すため、
  // 分割代入の header は実行時に undefined になり得る。noUncheckedIndexedAccess を
  // 無効化しているため型上は string[] だが、header.join を呼ぶ前にこの分岐で弾く。
  if (parsed.length === 0 || header.join(",") !== Object.keys(spec.shape).join(",")) {
    return fileError(`ヘッダが不正です(${spec.label}のCSVではありません)`);
  }
  const { validCount, errors, warnings, entities } = collectRows(kind, dataRows, state);
  return {
    validCount,
    errors,
    // Kind が未解決ジェネリックのため Record<string, EntityOf<Kind>> と AppState[Kind] の
    // 同値性を TS は証明できない(correlated union 制限)。具体化された各 Kind では構造的に一致する。
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- 上記 correlated union 制限のため
    entities: errors.length === 0 ? (entities as AppState[Kind]) : null,
    warnings,
  };
};
