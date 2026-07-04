/**
 * EquipmentDetail(/equipment/:id)の検証(screen-design/04-equipment-detail.md)。
 * 基本情報カード・編集遷移・存在しないid・空状態、点検校正項目テーブル、実施記録、
 * 点検校正項目モーダル・実施記録登録モーダルの起動を扱う。
 */

import { ROUTES, equipmentDetailPath } from "@/constants/routes";
import { EquipmentDetail } from "@/features/equipment/detail";
import {
  activePerson,
  equipmentFull,
  equipmentMinimal,
  equipmentSuspended,
  serviceItemExternal,
  serviceItemOfSuspendedEquipment,
  seedEquipmentFullServiceItemsAndRecords,
  seedEquipmentFullMasters,
} from "@/features/equipment/detail/detailFixtures";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

/** 遷移先確認用ダミー: 機器編集(:id を表示) */
const DummyEquipmentEdit = (): ReactElement => {
  const { id } = useParams();
  return <p>機器編集:{id}</p>;
};

const renderDetail = (id: string): void => {
  renderWithStore(
    <Routes>
      <Route path={ROUTES.EQUIPMENT_DETAIL} element={<EquipmentDetail />} />
      <Route path={ROUTES.EQUIPMENT_EDIT} element={<DummyEquipmentEdit />} />
    </Routes>,
    { initialEntries: [equipmentDetailPath(id)] },
  );
};

/**
 * 項目テーブル(1つ目のtable)のデータ行を取得する。項目名は実施記録テーブルの行にも
 * 出現するため、screen 全体ではなく項目テーブル内にスコープして曖昧マッチを避ける。
 */
const getServiceItemRow = (name: string | RegExp): HTMLElement => {
  const serviceItemTable = screen.getAllByRole("table").at(0);
  if (!serviceItemTable) throw new Error("項目テーブルが見つかりません");
  return within(serviceItemTable).getByRole("row", { name });
};

beforeEach(setupStoreIsolation);

describe("EquipmentDetail: 基本情報カード", () => {
  it("ヘッダに「管理番号 機器名」、カードに全属性(メーカー名解決・状態バッジ含む)が表示される", () => {
    seedEquipmentFullMasters();
    renderDetail(equipmentFull.id);

    expect(screen.getByRole("heading", { name: "EQ-001 ノギス" })).toBeInTheDocument();
    expect(screen.getByText("CD-15")).toBeInTheDocument();
    expect(screen.getByText("1234567")).toBeInTheDocument();
    expect(screen.getByText("ミツトヨ")).toBeInTheDocument();
    expect(screen.getByText("検査室")).toBeInTheDocument();
    expect(screen.getByText("稼働")).toBeInTheDocument();
    expect(screen.getByText("校正用マスターと同時保管")).toBeInTheDocument();
  });

  it("任意属性が未設定の機器は「—」で表示される", () => {
    seedStore({ equipment: { [equipmentMinimal.id]: equipmentMinimal } });
    renderDetail(equipmentMinimal.id);

    // なぜ5件か: 型式 / S/N / メーカー / 設置場所 / 備考 の5項目すべてが未設定
    expect(screen.getAllByText("—")).toHaveLength(5);
  });

  it("「編集」ボタンで機器編集画面へ遷移する", async () => {
    const user = userEvent.setup();
    seedEquipmentFullMasters();
    renderDetail(equipmentFull.id);

    await user.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.getByText(`機器編集:${equipmentFull.id}`)).toBeInTheDocument();
  });
});

describe("EquipmentDetail: 存在しないid", () => {
  it("機器一覧へリダイレクトする", () => {
    render(
      <MemoryRouter initialEntries={[equipmentDetailPath("does-not-exist")]}>
        <Routes>
          <Route path={ROUTES.EQUIPMENT_DETAIL} element={<EquipmentDetail />} />
          <Route path={ROUTES.EQUIPMENT_LIST} element={<div>機器一覧（テスト用マーカー）</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("機器一覧（テスト用マーカー）")).toBeInTheDocument();
  });
});

describe("EquipmentDetail: 空状態", () => {
  it("項目0件で文言とCTAが表示される", () => {
    seedEquipmentFullMasters();
    renderDetail(equipmentFull.id);

    expect(screen.getByText("点検校正項目が未登録です")).toBeInTheDocument();
    // なぜ2件か: セクション見出し右の「+ 項目を追加」と EmptyState 内の CTA の両方が表示される
    expect(screen.getAllByRole("button", { name: "+ 項目を追加" })).toHaveLength(2);
  });

  it("記録0件で文言が表示される", () => {
    seedEquipmentFullMasters();
    renderDetail(equipmentFull.id);

    expect(screen.getByText("実施記録が未登録です")).toBeInTheDocument();
  });
});

/**
 * EquipmentDetail: 実施記録テーブルの検証(screen-design/04-equipment-detail.md)。
 * 全項目横断マージ・doneDate降順(同日はid昇順)・結果の日本語ラベル・空備考の「—」を扱う。
 */
const getHistoryRows = (): HTMLElement[] => {
  // なぜ2つ目のtableか: 画面には項目テーブルと実施記録テーブルの2つがある
  const historyTable = screen.getAllByRole("table").at(1);
  if (!historyTable) throw new Error("実施記録テーブルが見つかりません");
  const [, ...dataRows] = within(historyTable).getAllByRole("row");
  return dataRows;
};

describe("EquipmentDetail: 実施記録", () => {
  beforeEach(() => {
    seedEquipmentFullMasters();
    seedEquipmentFullServiceItemsAndRecords();
  });

  it("全項目横断でdoneDate降順(同日はid昇順)に表示される", () => {
    renderDetail(equipmentFull.id);

    const rows = getHistoryRows();
    const summary = rows.map((row) => {
      const cells = within(row).getAllByRole("cell");
      return `${cells[0]?.textContent} ${cells[1]?.textContent}`;
    });

    // record-a(2026-06-25/月次点検) → record-b(同日/年次校正、idタイブレーク) → record-c(2025-06-18)
    expect(summary).toEqual(["2026-06-25 月次点検", "2026-06-25 年次校正", "2025-06-18 年次校正"]);
  });

  it("実施者・結果の日本語ラベル・備考(空は「—」)が表示される", () => {
    renderDetail(equipmentFull.id);

    const rows = getHistoryRows();
    const first = rows.at(0);
    const second = rows.at(1);
    const third = rows.at(2);
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

/**
 * EquipmentDetail: 点検校正項目テーブルの検証(screen-design/04-equipment-detail.md)。
 * 列内容・並び順(isActive優先→nextDueDate昇順)・淡色表示・ステータスバッジの
 * D-014両分岐(稼働=導出表示 / 休止=「—」)・担当者の「(無効)」注記(D-001)・
 * 記録ボタンの活性(Phase 7でRecordModalへ接続)を扱う。
 */
describe("EquipmentDetail: 項目テーブルの列内容", () => {
  it("種別・内外・周期・担当者名・次回期限が表示される", () => {
    seedEquipmentFullMasters();
    seedEquipmentFullServiceItemsAndRecords();
    renderDetail(equipmentFull.id);

    const externalRow = getServiceItemRow(/年次校正/u);
    expect(within(externalRow).getByText("校正")).toBeInTheDocument();
    expect(within(externalRow).getByText("外部")).toBeInTheDocument();
    expect(within(externalRow).getByText("1年")).toBeInTheDocument();
    expect(within(externalRow).getByText("田中")).toBeInTheDocument();
    expect(within(externalRow).getByText("2030-01-01")).toBeInTheDocument();

    const internalRow = getServiceItemRow(/月次点検/u);
    expect(within(internalRow).getByText("点検")).toBeInTheDocument();
    expect(within(internalRow).getByText("内部")).toBeInTheDocument();
  });

  it("担当者が無効化済みの項目は「(無効)」を注記して表示する(D-001)", () => {
    seedEquipmentFullMasters();
    seedEquipmentFullServiceItemsAndRecords();
    renderDetail(equipmentFull.id);

    expect(within(getServiceItemRow(/外観点検/u)).getByText("鈴木(無効)")).toBeInTheDocument();
  });
});

describe("EquipmentDetail: 項目テーブルの並び順・淡色表示", () => {
  it("isActive=trueをnextDueDate昇順で先に、isActive=falseは末尾+淡色になる", () => {
    seedEquipmentFullMasters();
    seedEquipmentFullServiceItemsAndRecords();
    renderDetail(equipmentFull.id);

    const serviceItemTable = screen.getAllByRole("table").at(0);
    if (!serviceItemTable) throw new Error("項目テーブルが見つかりません");
    const [, ...dataRows] = within(serviceItemTable).getAllByRole("row");
    const names = dataRows.map((row) => within(row).getAllByRole("cell")[1]?.textContent ?? "");

    // 有効: 月次点検(2000-01-01) → 年次校正(2030-01-01) → 外観点検(2099-01-01)、無効: 廃止予定項目が末尾
    expect(names).toEqual(["月次点検", "年次校正", "外観点検", "廃止予定項目"]);
    expect(getServiceItemRow(/廃止予定項目/u)).toHaveClass("text-slate-400");
    expect(getServiceItemRow(/月次点検/u)).not.toHaveClass("text-slate-400");
  });
});

describe("EquipmentDetail: 項目ステータス(D-014)", () => {
  it("稼働機器では導出ステータスをバッジ表示する", () => {
    seedEquipmentFullMasters();
    seedEquipmentFullServiceItemsAndRecords();
    renderDetail(equipmentFull.id);

    // nextDueDate=2000-01-01(過去) → 期限切れ、2030/2099(遠未来・案件なし) → 正常
    expect(within(getServiceItemRow(/月次点検/u)).getByText("期限切れ")).toBeInTheDocument();
    expect(within(getServiceItemRow(/年次校正/u)).getByText("正常")).toBeInTheDocument();
    expect(within(getServiceItemRow(/外観点検/u)).getByText("正常")).toBeInTheDocument();
  });

  it("休止機器では期限切れ相当でもステータス欄が「—」になる", () => {
    seedStore({
      equipment: { [equipmentSuspended.id]: equipmentSuspended },
      persons: { [activePerson.id]: activePerson },
      serviceItems: {
        [serviceItemOfSuspendedEquipment.id]: serviceItemOfSuspendedEquipment,
      },
    });
    renderDetail(equipmentSuspended.id);

    const row = getServiceItemRow(/定期点検/u);
    const [statusCell] = within(row).getAllByRole("cell");
    expect(statusCell).toHaveTextContent("—");
    expect(within(row).queryByText("期限切れ")).not.toBeInTheDocument();
  });
});

describe("EquipmentDetail: 記録ボタン", () => {
  // なぜ変更したか: Phase 7 で実施記録登録モーダル(RecordModal)を接続し、記録ボタンを活性化した。
  // 旧テストは接続前の先行設置(常時disabled)を検証していたが、活性化が仕様(07-record-modal.md)の
  // ため期待値を活性へ是正する(テストを弱める改変ではない)。起動結節点の検証は recordLaunch.test.tsx。
  it("各項目行の記録ボタンが活性で表示される", () => {
    seedEquipmentFullMasters();
    seedEquipmentFullServiceItemsAndRecords();
    renderDetail(equipmentFull.id);

    const recordButtons = screen.getAllByRole("button", { name: "記録" });
    expect(recordButtons).toHaveLength(4);
    for (const button of recordButtons) {
      expect(button).toBeEnabled();
    }
  });
});

/**
 * EquipmentDetail: 点検校正項目モーダル(ServiceItemModal)の起動結節点の検証
 * (screen-design/04-equipment-detail.md「操作・アクション」)。
 * 「+ 項目を追加」=新規モード(equipmentIdプリセット)、行「編集」=編集モード(プリフィル)。
 * モーダル自体の入力・検証は ServiceItemModal.test.tsx の責務。
 */
/** モーダルタイトルからdialog要素を特定し、開いていることを検証して返す */
const getOpenDialog = (title: string): HTMLElement => {
  const dialogElement = screen.getByText(title).closest("dialog");
  if (!dialogElement) throw new Error("dialog要素が見つかりません");
  expect(dialogElement).toHaveAttribute("open");
  return dialogElement;
};

describe("EquipmentDetail: ServiceItemModal起動", () => {
  beforeEach(() => {
    seedEquipmentFullMasters();
    seedEquipmentFullServiceItemsAndRecords();
  });

  it("「+ 項目を追加」で新規モードのモーダルが開き、対象機器がプリセットされる", async () => {
    const user = userEvent.setup();
    renderDetail(equipmentFull.id);

    await user.click(screen.getByRole("button", { name: "+ 項目を追加" }));

    const dialogElement = getOpenDialog("点検校正項目を追加");
    expect(within(dialogElement).getByText("EQ-001 ノギス")).toBeInTheDocument();
    expect(within(dialogElement).getByLabelText("項目名", { exact: false })).toHaveValue("");
  });

  it("行の「編集」で編集モードのモーダルが開き、既存値がプリフィルされる", async () => {
    const user = userEvent.setup();
    renderDetail(equipmentFull.id);

    await user.click(
      within(getServiceItemRow(/年次校正/u)).getByRole("button", { name: "編集" }),
    );

    const dialogElement = getOpenDialog("点検校正項目を編集");
    expect(within(dialogElement).getByLabelText("項目名", { exact: false })).toHaveValue(
      serviceItemExternal.name,
    );
    expect(within(dialogElement).getByLabelText("外部")).toBeChecked();
  });

  it("モーダルを閉じると再度「+ 項目を追加」で新規モードとして開き直せる", async () => {
    const user = userEvent.setup();
    renderDetail(equipmentFull.id);

    await user.click(
      within(getServiceItemRow(/年次校正/u)).getByRole("button", { name: "編集" }),
    );
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    await user.click(screen.getByRole("button", { name: "+ 項目を追加" }));

    const dialogElement = getOpenDialog("点検校正項目を追加");
    expect(within(dialogElement).getByLabelText("項目名", { exact: false })).toHaveValue("");
  });
});
