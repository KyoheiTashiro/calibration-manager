/**
 * EquipmentDetail: 実施記録テーブルの検証(screen-design/04-equipment-detail.md)。
 * 全項目横断マージ・doneDate降順(同日はid昇順)・結果の日本語ラベル・空備考の「—」を扱う。
 * ファイル分割の理由は index.test.tsx 参照。
 */

import { ROUTES, equipmentDetailPath } from "@/constants/routes";
import { EquipmentDetail } from "@/features/equipment/detail";
import {
  equipmentFull,
  seedEquipmentFullInspectionItemsAndRecords,
  seedEquipmentFullMasters,
} from "@/features/equipment/detail/detailFixtures";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const renderDetail = (): ReturnType<typeof renderWithStore> =>
  renderWithStore(<EquipmentDetail />, {
    initialEntries: [equipmentDetailPath(equipmentFull.id)],
    routePath: ROUTES.EQUIPMENT_DETAIL,
  });

const getHistoryRows = (): HTMLElement[] => {
  // なぜ2つ目のtableか: 画面には項目テーブルと実施記録テーブルの2つがある
  const [, historyTable] = screen.getAllByRole("table");
  if (!historyTable) throw new Error("実施記録テーブルが見つかりません");
  const [, ...dataRows] = within(historyTable).getAllByRole("row");
  return dataRows;
};

beforeEach(() => {
  setupStoreIsolation();
  seedEquipmentFullMasters();
  seedEquipmentFullInspectionItemsAndRecords();
});

describe("EquipmentDetail: 実施記録", () => {
  it("全項目横断でdoneDate降順(同日はid昇順)に表示される", () => {
    renderDetail();

    const rows = getHistoryRows();
    const summary = rows.map((row) => {
      const cells = within(row).getAllByRole("cell");
      return `${cells[0]?.textContent} ${cells[1]?.textContent}`;
    });

    // record-a(2026-06-25/月次点検) → record-b(同日/年次校正、idタイブレーク) → record-c(2025-06-18)
    expect(summary).toEqual(["2026-06-25 月次点検", "2026-06-25 年次校正", "2025-06-18 年次校正"]);
  });

  it("実施者・結果の日本語ラベル・備考(空は「—」)が表示される", () => {
    renderDetail();

    const [first, second, third] = getHistoryRows();
    if (!first || !second || !third) throw new Error("実施記録の行が3件表示されていません");

    expect(within(first).getByText("鈴木")).toBeInTheDocument();
    expect(within(first).getByText("合格")).toBeInTheDocument();
    expect(within(first).getByText("—")).toBeInTheDocument();

    expect(within(second).getByText("田中")).toBeInTheDocument();
    expect(within(second).getByText("不合格")).toBeInTheDocument();

    expect(within(third).getByText("ミツトヨ校正センター")).toBeInTheDocument();
    expect(within(third).getByText("調整合格")).toBeInTheDocument();
    expect(within(third).getByText("証明書#A-102")).toBeInTheDocument();
  });
});
