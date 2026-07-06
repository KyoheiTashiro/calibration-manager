import { Button } from "@/components/ui";
import {
  buildEntityCsv,
  CSV_ENTITY_KINDS,
  type CsvEntityKind,
  ENTITY_CSV_SPECS,
} from "@/features/settings/components/csv/entityCsv";
import type { AppState } from "@/store/types";
import { CSV_BOM } from "@/utils/csv";
import { todayIsoDate } from "@/utils/time";
import type { ReactElement } from "react";

const downloadEntityCsv = (kind: CsvEntityKind, state: AppState): void => {
  const csv = CSV_BOM + buildEntityCsv(kind, state[kind]);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${kind}_${todayIsoDate()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

type Props = {
  state: AppState;
};

export const ExportSection = ({ state }: Props): ReactElement => (
  <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
    <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">CSVエクスポート</h2>
    <p className="text-sm text-slate-700">
      データの種類ごとにCSVファイル(UTF-8 BOM付き・Excel互換)をダウンロードします。
    </p>
    <div className="flex flex-wrap gap-2">
      {CSV_ENTITY_KINDS.map((kind) => (
        <Button
          key={kind}
          variant="secondary"
          onClick={() => {
            downloadEntityCsv(kind, state);
          }}
        >
          {ENTITY_CSV_SPECS[kind].label}
        </Button>
      ))}
    </div>
  </section>
);
