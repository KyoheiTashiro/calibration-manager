import type { ServiceItemStatus } from "@/domain/serviceItemStatus";
import { statusBadgeClass, statusBadgeLabel } from "@/domain/statusBadge";
import type { ReactElement } from "react";

/**
 * ステータスバッジ。色・日本語ラベルは常にセットで表示する。
 * 色・文言はここで個別定義せず、必ず domain/statusBadge.ts のヘルパー経由で取得する
 * （全画面で単一マッピングを共有するため）。
 */
export const StatusBadge = ({ status }: { status: ServiceItemStatus }): ReactElement => {
  const baseClassName = "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium";
  const className = `${baseClassName} ${statusBadgeClass(status)}`;

  return <span className={className}>{statusBadgeLabel(status)}</span>;
};
