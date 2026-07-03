/**
 * EquipmentDetail(/equipment/:id)の検証: 基本情報カード・編集遷移・存在しないid・空状態
 * (screen-design/04-equipment-detail.md)。項目テーブルは itemTable.test.tsx、実施履歴は
 * history.test.tsx、モーダル起動は modalLaunch.test.tsx を参照(oxlint max-lines 対応の分割)。
 */

import { ROUTES, equipmentDetailPath, equipmentEditPath } from "@/constants/routes";
import { EquipmentDetail } from "@/features/equipment/detail";
import {
  equipmentFull,
  equipmentMinimal,
  seedEquipmentFullMasters,
} from "@/features/equipment/detail/detailFixtures";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type * as ReactRouterDomModule from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// なぜ: 「編集」ボタンの遷移先検証のため useNavigate だけスパイへ差し替える
// (equipment/form/index.test.tsx と同じ理由・同じ手法。Navigate/Routes 等の実実装は維持)。
const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", (importOriginal) =>
  importOriginal<typeof ReactRouterDomModule>().then((actual) => ({
    ...actual,
    useNavigate: (): typeof navigateSpy => navigateSpy,
  })),
);

const renderDetail = (id: string): ReturnType<typeof renderWithStore> =>
  renderWithStore(<EquipmentDetail />, {
    initialEntries: [equipmentDetailPath(id)],
    routePath: ROUTES.EQUIPMENT_DETAIL,
  });

beforeEach(() => {
  setupStoreIsolation();
  navigateSpy.mockClear();
});

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

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("「編集」ボタンで機器編集画面へ遷移する", async () => {
    const user = userEvent.setup();
    seedEquipmentFullMasters();
    renderDetail(equipmentFull.id);

    await user.click(screen.getByRole("button", { name: "編集" }));

    expect(navigateSpy).toHaveBeenCalledWith(equipmentEditPath(equipmentFull.id));
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

    expect(screen.getByText("この機器にはまだ点検校正項目がありません")).toBeInTheDocument();
    // なぜ2件か: セクション見出し右の「+ 項目を追加」と EmptyState 内の CTA の両方が表示される
    expect(screen.getAllByRole("button", { name: "+ 項目を追加" })).toHaveLength(2);
  });

  it("履歴0件で文言が表示される", () => {
    seedEquipmentFullMasters();
    renderDetail(equipmentFull.id);

    expect(screen.getByText("実施履歴はまだありません")).toBeInTheDocument();
  });
});
