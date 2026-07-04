/**
 * InspectionItemList: テーブル描画の検証(screen-design/05-inspection-item-list.md「表示項目」)。
 * 列内容・nextDueDate 昇順・「—」表示・対象除外(非稼働機器/無効項目)・
 * 「案件」ボタンの出し分け(canCreateOrder)・空状態を確認する。
 * ステータス導出は todayIsoDate() 依存だが、フィクスチャの nextDueDate を極端値にして決定的にする。
 */

import { InspectionItemList } from "@/features/inspectionItems/list";
import {
  personSato,
  personSuzuki,
  seedInspectionItemList,
} from "@/features/inspectionItems/list/listFixtures";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const renderList = (search = ""): ReturnType<typeof renderWithStore> =>
  renderWithStore(<InspectionItemList />, { initialEntries: [`/inspection-items${search}`] });

/** ヘッダ行を除いたデータ行(tbody)を返す */
const getBodyRows = (): HTMLElement[] => screen.getAllByRole("row").slice(1);

beforeEach(() => {
  setupStoreIsolation();
});

describe("InspectionItemList: テーブル描画", () => {
  it("対象項目を nextDueDate 昇順で表示し、管理番号・機器名・担当ラベルを描画する", () => {
    seedInspectionItemList();
    renderList();

    const rows = getBodyRows();
    expect(rows).toHaveLength(3);
    // 昇順: 年次校正(2000) → 半期校正(2098) → 月次点検(2099)
    expect(rows[0]).toHaveTextContent("年次校正");
    expect(rows[1]).toHaveTextContent("半期校正");
    expect(rows[2]).toHaveTextContent("月次点検");

    // 1行目: 管理番号・機器名・担当
    expect(rows[0]).toHaveTextContent("EQ-001");
    expect(rows[0]).toHaveTextContent("ノギス");
    expect(rows[0]).toHaveTextContent("田中");
  });

  it("lastDoneDate 未設定・内部項目の発注推奨日は「—」を表示する(1行に2箇所)", () => {
    seedInspectionItemList();
    renderList();

    const okRow = screen.getByRole("row", { name: /月次点検/u });
    expect(okRow).toHaveTextContent(personSato.name);
    expect(within(okRow).getAllByText("—")).toHaveLength(2);
  });

  it("非稼働機器の項目・isActive=false の項目は表示しない", () => {
    seedInspectionItemList();
    renderList();

    expect(screen.queryByText("廃止項目")).not.toBeInTheDocument();
    expect(screen.queryByText("休止機器点検")).not.toBeInTheDocument();
  });

  it("「案件」ボタンは canCreateOrder=true の行だけに出す", () => {
    seedInspectionItemList();
    renderList();

    // 外部・有効案件なし → 表示
    const overdueRow = screen.getByRole("row", { name: /年次校正/u });
    expect(within(overdueRow).getByRole("button", { name: "案件" })).toBeInTheDocument();

    // 外部だが進行中案件あり → 非表示
    const inProgressRow = screen.getByRole("row", { name: /半期校正/u });
    expect(within(inProgressRow).queryByRole("button", { name: "案件" })).not.toBeInTheDocument();

    // 内部 → 非表示
    const okRow = screen.getByRole("row", { name: /月次点検/u });
    expect(within(okRow).queryByRole("button", { name: "案件" })).not.toBeInTheDocument();
  });

  it("表示対象が0件なら「点検校正項目が未登録です」を出す", () => {
    // seed しない = inspectionItems 空
    renderList();

    expect(screen.getByText("点検校正項目が未登録です")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("対象はあるが絞り込み0件なら「条件に一致する項目はありません」+クリアを出す", () => {
    seedInspectionItemList();
    // 鈴木(無効)担当の可視項目は無い → filtered 0
    renderList(`?personId=${personSuzuki.id}`);

    expect(screen.getByText("条件に一致する項目はありません")).toBeInTheDocument();
    // フィルタ行のクリア + 空状態のクリアの2つが並ぶ(§5)
    expect(screen.getAllByRole("button", { name: "クリア" })).toHaveLength(2);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
