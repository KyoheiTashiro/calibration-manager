/**
 * EquipmentDetail: 点検校正項目テーブルの検証(screen-design/04-equipment-detail.md)。
 * 列内容・並び順(isActive優先→nextDueDate昇順)・淡色表示・ステータスバッジの
 * D-014両分岐(稼働=導出表示 / 休止=「—」)・担当者の「(無効)」注記(D-001)・
 * 記録ボタンの活性(Phase 7でRecordModalへ接続)を扱う。ファイル分割の理由は index.test.tsx 参照。
 */

import { ROUTES, equipmentDetailPath } from "@/constants/routes";
import { EquipmentDetail } from "@/features/equipment/detail";
import {
  activePerson,
  equipmentFull,
  equipmentSuspended,
  inspectionItemOfSuspendedEquipment,
  seedEquipmentFullInspectionItemsAndRecords,
  seedEquipmentFullMasters,
} from "@/features/equipment/detail/detailFixtures";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const renderDetail = (id: string): ReturnType<typeof renderWithStore> =>
  renderWithStore(<EquipmentDetail />, {
    initialEntries: [equipmentDetailPath(id)],
    routePath: ROUTES.EQUIPMENT_DETAIL,
  });

/**
 * 項目テーブル(1つ目のtable)のデータ行を取得する。項目名は実施履歴テーブルの行にも
 * 出現するため、screen 全体ではなく項目テーブル内にスコープして曖昧マッチを避ける。
 */
const getInspectionItemRow = (name: string | RegExp): HTMLElement => {
  const [inspectionItemTable] = screen.getAllByRole("table");
  if (!inspectionItemTable) throw new Error("項目テーブルが見つかりません");
  return within(inspectionItemTable).getByRole("row", { name });
};

beforeEach(setupStoreIsolation);

describe("EquipmentDetail: 項目テーブルの列内容", () => {
  it("種別・内外・周期・担当者名・次回期限が表示される", () => {
    seedEquipmentFullMasters();
    seedEquipmentFullInspectionItemsAndRecords();
    renderDetail(equipmentFull.id);

    const externalRow = getInspectionItemRow(/年次校正/u);
    expect(within(externalRow).getByText("校正")).toBeInTheDocument();
    expect(within(externalRow).getByText("外部")).toBeInTheDocument();
    expect(within(externalRow).getByText("1Y")).toBeInTheDocument();
    expect(within(externalRow).getByText("田中")).toBeInTheDocument();
    expect(within(externalRow).getByText("2030-01-01")).toBeInTheDocument();

    const internalRow = getInspectionItemRow(/月次点検/u);
    expect(within(internalRow).getByText("点検")).toBeInTheDocument();
    expect(within(internalRow).getByText("内部")).toBeInTheDocument();
  });

  it("担当者が無効化済みの項目は「(無効)」を注記して表示する(D-001)", () => {
    seedEquipmentFullMasters();
    seedEquipmentFullInspectionItemsAndRecords();
    renderDetail(equipmentFull.id);

    expect(within(getInspectionItemRow(/外観点検/u)).getByText("鈴木(無効)")).toBeInTheDocument();
  });
});

describe("EquipmentDetail: 項目テーブルの並び順・淡色表示", () => {
  it("isActive=trueをnextDueDate昇順で先に、isActive=falseは末尾+淡色になる", () => {
    seedEquipmentFullMasters();
    seedEquipmentFullInspectionItemsAndRecords();
    renderDetail(equipmentFull.id);

    const [inspectionItemTable] = screen.getAllByRole("table");
    if (!inspectionItemTable) throw new Error("項目テーブルが見つかりません");
    const [, ...dataRows] = within(inspectionItemTable).getAllByRole("row");
    const names = dataRows.map((row) => within(row).getAllByRole("cell")[1]?.textContent ?? "");

    // 有効: 月次点検(2000-01-01) → 年次校正(2030-01-01) → 外観点検(2099-01-01)、無効: 廃止予定項目が末尾
    expect(names).toEqual(["月次点検", "年次校正", "外観点検", "廃止予定項目"]);
    expect(getInspectionItemRow(/廃止予定項目/u)).toHaveClass("text-slate-400");
    expect(getInspectionItemRow(/月次点検/u)).not.toHaveClass("text-slate-400");
  });
});

describe("EquipmentDetail: 項目ステータス(D-014)", () => {
  it("稼働機器では導出ステータスをバッジ表示する", () => {
    seedEquipmentFullMasters();
    seedEquipmentFullInspectionItemsAndRecords();
    renderDetail(equipmentFull.id);

    // nextDueDate=2000-01-01(過去) → 期限切れ、2030/2099(遠未来・案件なし) → 正常
    expect(within(getInspectionItemRow(/月次点検/u)).getByText("期限切れ")).toBeInTheDocument();
    expect(within(getInspectionItemRow(/年次校正/u)).getByText("正常")).toBeInTheDocument();
    expect(within(getInspectionItemRow(/外観点検/u)).getByText("正常")).toBeInTheDocument();
  });

  it("休止機器では期限切れ相当でもステータス欄が「—」になる", () => {
    seedStore({
      equipment: { [equipmentSuspended.id]: equipmentSuspended },
      persons: { [activePerson.id]: activePerson },
      inspectionItems: { [inspectionItemOfSuspendedEquipment.id]: inspectionItemOfSuspendedEquipment },
    });
    renderDetail(equipmentSuspended.id);

    const row = getInspectionItemRow(/定期点検/u);
    const [statusCell] = within(row).getAllByRole("cell");
    expect(statusCell).toHaveTextContent("—");
    expect(within(row).queryByText("期限切れ")).not.toBeInTheDocument();
  });
});

describe("EquipmentDetail: 記録ボタン", () => {
  // なぜ変更したか: Phase 7 で実施記録モーダル(RecordModal)を接続し、記録ボタンを活性化した。
  // 旧テストは接続前の先行設置(常時disabled)を検証していたが、活性化が仕様(07-record-modal.md)の
  // ため期待値を活性へ是正する(テストを弱める改変ではない)。起動結節点の検証は recordLaunch.test.tsx。
  it("各項目行の記録ボタンが活性で表示される", () => {
    seedEquipmentFullMasters();
    seedEquipmentFullInspectionItemsAndRecords();
    renderDetail(equipmentFull.id);

    const recordButtons = screen.getAllByRole("button", { name: "記録" });
    expect(recordButtons).toHaveLength(4);
    for (const button of recordButtons) {
      expect(button).toBeEnabled();
    }
  });
});
