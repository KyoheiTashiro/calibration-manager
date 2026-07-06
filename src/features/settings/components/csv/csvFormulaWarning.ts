/**
 * 数式インジェクション様セルの警告収集(§11、D-053)。エクスポートしたCSVをExcel等で開くと
 * 数式として実行され得る値への注意喚起であり、エラーではなく取り込みを妨げない
 * (importValidation.ts から分離: max-lines/max-statements 対策)。
 * 数値として解釈できるセル(`-20` 等)は正当な負数のため対象外。
 * 列数不正の行は列とセルの対応が取れないため呼び出し側で対象外とする。
 */

import {
  CSV_COLUMN_KIND,
  type CsvEntityKind,
  type EntityCsvSpec,
  NUMBER_CELL_PATTERN,
} from "@/features/settings/components/csv/entityCsv";

/** Excel等が数式として解釈し得るセル先頭文字(CSVインジェクション、D-053) */
const FORMULA_LIKE_PATTERN = /^[=+\-@\t\r]/u;

export type FormulaWarning = {
  /** ファイル上の行番号(ヘッダ=1) */
  line: number;
  message: string;
};

/** 1データ行の文字列列を走査し、数式として解釈され得るセルの警告を返す */
export const collectFormulaWarnings = <Kind extends CsvEntityKind>(
  spec: EntityCsvSpec<Kind>,
  cells: string[],
  line: number,
): FormulaWarning[] => {
  const warnings: FormulaWarning[] = [];
  for (const [columnIndex, column] of spec.columns.entries()) {
    if (column.kind !== CSV_COLUMN_KIND.STRING && column.kind !== CSV_COLUMN_KIND.OPTIONAL_STRING) {
      continue;
    }
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
