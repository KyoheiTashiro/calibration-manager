import { Tabs } from "@/components/ui/Tabs";
import { SEARCH_REVEAL_EVENT } from "@/features/manual/search/revealEvent";
import {
  CSV_ENTITY_KINDS,
  type CsvEntityKind,
  ENTITY_CSV_SPECS,
} from "@/features/settings/components/csv/entityCsv";
import { useEffect, useRef, useState, type ReactElement } from "react";

import { ImportCheckTable } from "./ImportCheckTable";

/** タブの並びは CSV_ENTITY_KINDS(推奨インポート順)と共通。マニュアル本文の記載と一致させる(D-058 / D-060) */
const TABS = CSV_ENTITY_KINDS.map((kind) => ({ key: kind, label: ENTITY_CSV_SPECS[kind].label }));

const isCsvEntityKind = (key: string): key is CsvEntityKind =>
  (CSV_ENTITY_KINDS as readonly string[]).includes(key);

export const ImportCheckTabs = (): ReactElement => {
  const [activeKind, setActiveKind] = useState<CsvEntityKind>(CSV_ENTITY_KINDS[0]);
  const containerRef = useRef<HTMLDivElement>(null);

  // マニュアル内検索(D-072)が非アクティブタブの文言も見つけられるよう、hidden で
  // 各パネルを DOM に保持したまま切替表示する(unmount しない)(D-073)。
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return (): void => {
        // ref 未設定時は購読していないため後始末不要
      };
    }

    const handleReveal = (event: Event): void => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }
      const kind = event.target.dataset.csvEntityKind;
      if (kind !== undefined && isCsvEntityKind(kind)) {
        setActiveKind(kind);
      }
    };

    container.addEventListener(SEARCH_REVEAL_EVENT, handleReveal);
    return (): void => {
      container.removeEventListener(SEARCH_REVEAL_EVENT, handleReveal);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      <Tabs
        tabs={TABS}
        activeKey={activeKind}
        onChange={(key) => {
          if (isCsvEntityKind(key)) setActiveKind(key);
        }}
      />
      {CSV_ENTITY_KINDS.map((kind) => (
        <div key={kind} data-csv-entity-kind={kind} hidden={kind !== activeKind}>
          <ImportCheckTable kind={kind} />
        </div>
      ))}
    </div>
  );
};
