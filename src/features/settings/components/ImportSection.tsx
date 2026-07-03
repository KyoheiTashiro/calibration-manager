/**
 * 設定画面のインポートセクション(screen-design/11-settings.md §11、D-029 / D-030)。
 * 対象種別を選び CSV を検証 → プレビュー → 確認ダイアログ後に対象 Record を全置換する。
 * エラーが1件でもあれば取り込み不可([確定]非活性、D-030)。
 */

import { Button, ConfirmModal, Select } from "@/components/ui";
import {
  CSV_ENTITY_KINDS,
  type CsvEntityKind,
  ENTITY_CSV_SPECS,
} from "@/features/settings/entityCsv";
import {
  type ImportValidationResult,
  validateEntityCsv,
} from "@/features/settings/importValidation";
import type { AppState } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { type ChangeEvent, type ReactElement, type ReactNode, useRef, useState } from "react";

const ENTITY_OPTIONS = CSV_ENTITY_KINDS.map((kind) => ({
  value: kind,
  label: ENTITY_CSV_SPECS[kind].label,
}));

type Props = {
  /** 参照整合の突合先となる現在のストア全状態(D-029) */
  state: AppState;
};

export const ImportSection = ({ state }: Props): ReactElement => {
  const replaceEntities = useAppStore((store) => store.replaceEntities);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // なぜ: file.text() の解決前に対象種別の変更・クリアが起きた場合、旧種別で検証した
  // 結果を書き込むと種別と entities が食い違う(誤った Record を全置換し得る)。
  // クリアのたびに世代を進め、古い検証結果は破棄する。
  const validationSeq = useRef(0);
  const [kind, setKind] = useState<CsvEntityKind>(CSV_ENTITY_KINDS[0]);
  const [fileName, setFileName] = useState<string>();
  const [result, setResult] = useState<ImportValidationResult<CsvEntityKind> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string>();

  const { label } = ENTITY_CSV_SPECS[kind];
  const canConfirm = fileName !== undefined && result !== null && result.entities !== null;

  // なぜ: 検証結果の陳腐化を防ぐため、選択済みファイル・プレビュー・input値をまとめて破棄する。
  const clearSelection = (): void => {
    validationSeq.current += 1;
    setFileName(undefined);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKindChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setKind(event.target.value as CsvEntityKind);
    setDoneMessage(undefined);
    clearSelection();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    validationSeq.current += 1;
    const seq = validationSeq.current;
    // なぜ .then か: oxc(no-async-await) 方針のため async/await ではなく Promise チェーンで扱う。
    file
      .text()
      .then((text) => {
        if (seq !== validationSeq.current) return;
        setDoneMessage(undefined);
        setFileName(file.name);
        setResult(validateEntityCsv(kind, text, state));
      })
      .catch(() => {
        // 読み取り失敗は例外を投げず無視する(coding-standards §8)
      });
  };

  const handleCancel = (): void => {
    setDoneMessage(undefined);
    clearSelection();
  };

  const handleConfirmImport = (): void => {
    setConfirmOpen(false);
    const entities = result?.entities;
    if (entities === null || entities === undefined) return;
    replaceEntities(kind, entities);
    const message = `${label}を ${result?.validCount ?? 0} 件取り込みました`;
    clearSelection();
    setDoneMessage(message);
  };

  const renderPreview = (): ReactNode => {
    if (doneMessage !== undefined) {
      return <output className="text-green-700">{doneMessage}</output>;
    }
    if (result === null) {
      return (
        <p className="text-slate-500">CSVファイルを選択すると、ここに検証結果が表示されます</p>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        <p className="text-green-700">✓ {result.validCount}行 取り込み可</p>
        {result.errorRowCount > 0 && (
          <>
            <p className="text-danger">✗ {result.errorRowCount}行 エラー</p>
            <ul className="text-danger flex flex-col gap-0.5">
              {result.errors.map((error) => (
                <li key={`${error.line}-${error.message}`}>
                  行{error.line}: {error.message}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">CSVインポート</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Select label="対象" options={ENTITY_OPTIONS} value={kind} onChange={handleKindChange} />
        </div>
        <div className="flex items-center gap-2">
          {/* なぜ: ネイティブの file input は見た目をボタンに揃えられないため sr-only で隠し、
              共通 Button から click() で起動する。aria-label はテスト・支援技術向けの参照名。 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            aria-label="ファイル"
            onChange={handleFileChange}
            className="sr-only"
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            ファイルを選択
          </Button>
          <span className="text-sm text-slate-500">{fileName ?? "未選択"}</span>
        </div>
      </div>

      <div className="border-line rounded border p-3 text-sm">{renderPreview()}</div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={handleCancel}>
          キャンセル
        </Button>
        <Button disabled={!canConfirm} onClick={() => setConfirmOpen(true)}>
          確定
        </Button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`${label}の取り込み`}
        message={`既存の${label}データは取り込み内容で置き換えられます。よろしいですか?`}
        confirmLabel="取り込む"
        danger
        onConfirm={handleConfirmImport}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
};
