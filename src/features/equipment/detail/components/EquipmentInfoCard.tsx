/**
 * 機器詳細画面（screen-design/04-equipment-detail.md）の基本情報カード。
 * 型式・S/N・メーカー名解決・設置場所・状態バッジ・備考を表示専用で描画する。
 */

import { Badge } from "@/components/ui";
import {
  EQUIPMENT_STATUS_BADGE_CLASSES,
  EQUIPMENT_STATUS_LABELS,
} from "@/features/equipment/constants";
import type { Equipment, Vendor } from "@/store/types";
import type { ReactElement } from "react";

type Props = {
  equipment: Equipment;
  vendors: Record<string, Vendor>;
};

export const EquipmentInfoCard = ({ equipment, vendors }: Props): ReactElement => (
  <div className="rounded border border-slate-200 p-4">
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-slate-500">型式</dt>
        <dd>{equipment.model ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-slate-500">S/N</dt>
        <dd>{equipment.serialNo ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-slate-500">メーカー</dt>
        <dd>
          {(equipment.manufacturerId !== undefined && vendors[equipment.manufacturerId]?.name) ||
            "—"}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">設置場所</dt>
        <dd>{equipment.location ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-slate-500">状態</dt>
        <dd>
          <Badge className={EQUIPMENT_STATUS_BADGE_CLASSES[equipment.status]}>
            {EQUIPMENT_STATUS_LABELS[equipment.status]}
          </Badge>
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">備考</dt>
        <dd>{equipment.note ?? "—"}</dd>
      </div>
    </dl>
  </div>
);
