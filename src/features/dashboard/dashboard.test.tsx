/**
 * Dashboard(/)の検証(screen-design/01-dashboard.md)。
 * サマリーカード件数・カードクリック遷移(プリフィルタURL)・要対応リストの絞り込みと行クリック遷移・
 * 最新の通知の描画と「通知センターへ」遷移・空状態2種を扱う。
 * 集計/選定の網羅は hooks.test.ts が担うため、ここは実ストア→描画→遷移の結線を確認する。
 */

import { ROUTES } from "@/constants/routes";
import { Dashboard } from "@/features/dashboard";
import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  SERVICE_ITEM_TYPE,
  NOTIFICATION_TARGET_TYPE,
  NOTIFICATION_TYPE,
  type Equipment,
  type ServiceItem,
  type Notification,
  type Person,
} from "@/store/types";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";
import { Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

/** 遷移先確認用ダミー: 項目一覧(status クエリを表示) */
const DummyServiceItemList = (): ReactElement => {
  const [params] = useSearchParams();
  return <p>項目一覧:{params.get("status")}</p>;
};

/** 遷移先確認用ダミー: 機器詳細(:id を表示) */
const DummyEquipmentDetail = (): ReactElement => {
  const { id } = useParams();
  return <p>機器詳細:{id}</p>;
};

const renderDashboardWithRoutes = (): void => {
  renderWithStore(
    <Routes>
      <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
      <Route path={ROUTES.SERVICE_ITEM_LIST} element={<DummyServiceItemList />} />
      <Route path={ROUTES.EQUIPMENT_DETAIL} element={<DummyEquipmentDetail />} />
      <Route path={ROUTES.NOTIFICATION_LIST} element={<p>通知センター画面</p>} />
    </Routes>,
    { initialEntries: [ROUTES.DASHBOARD] },
  );
};

const tanaka: Person = {
  id: "person-1",
  name: "田中",
  email: "tanaka@example.com",
  isActive: true,
};

const equipment1: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  status: EQUIPMENT_STATUS.ACTIVE,
};

const makeServiceItem = (
  overrides: Partial<ServiceItem> & Pick<ServiceItem, "id" | "nextDueDate">,
): ServiceItem => ({
  equipmentId: equipment1.id,
  type: SERVICE_ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: CYCLE.Y1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: tanaka.id,
  noticeDaysBefore: 30,
  isActive: true,
  ...overrides,
});

// 期限切れ(過去日)・正常(遠未来)で今日に依存せず導出ステータスを確定させる
const overdueServiceItemA = makeServiceItem({
  id: "item-a",
  name: "A校正",
  nextDueDate: "2000-01-01",
});
const overdueServiceItemB = makeServiceItem({
  id: "item-b",
  name: "B点検",
  type: SERVICE_ITEM_TYPE.INSPECTION,
  nextDueDate: "2000-06-01",
});
const okServiceItem = makeServiceItem({
  id: "item-ok",
  name: "OK校正",
  nextDueDate: "2999-12-31",
});

const seedActionScenario = (): void => {
  seedStore({
    persons: { [tanaka.id]: tanaka },
    equipment: { [equipment1.id]: equipment1 },
    serviceItems: {
      [overdueServiceItemA.id]: overdueServiceItemA,
      [overdueServiceItemB.id]: overdueServiceItemB,
      [okServiceItem.id]: okServiceItem,
    },
  });
};

beforeEach(setupStoreIsolation);

describe("Dashboard: サマリーカード", () => {
  it("導出ステータスごとの件数を表示する(overdue=2, ok は非カード)", () => {
    seedActionScenario();
    renderDashboardWithRoutes();

    const overdueCard = screen.getByRole("button", { name: /期限切れ/u });
    expect(within(overdueCard).getByText("2")).toBeInTheDocument();

    // 要発注・期限接近・校正中は0件
    expect(
      within(screen.getByRole("button", { name: /要発注/u })).getByText("0"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: /期限接近/u })).getByText("0"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: /校正中/u })).getByText("0"),
    ).toBeInTheDocument();
  });

  it("カードクリックで /service-items?status=<値> へ遷移する", async () => {
    const user = userEvent.setup();
    seedActionScenario();
    renderDashboardWithRoutes();

    await user.click(screen.getByRole("button", { name: /期限切れ/u }));

    expect(screen.getByText("項目一覧:overdue")).toBeInTheDocument();
  });
});

describe("Dashboard: 要対応項目リスト", () => {
  it("overdue/orderNow/dueSoon のみ表示し ok は除外する", () => {
    seedActionScenario();
    renderDashboardWithRoutes();

    expect(screen.getByText("A校正")).toBeInTheDocument();
    expect(screen.getByText("B点検")).toBeInTheDocument();
    expect(screen.queryByText("OK校正")).not.toBeInTheDocument();
  });

  it("nextDueDate 昇順で並ぶ(同一 overdue グループ内)", () => {
    seedActionScenario();
    renderDashboardWithRoutes();

    const rows = screen.getAllByRole("row").slice(1); // 先頭はヘッダ行
    // 列: 状態/管理番号/機器名/項目名/種別/担当/次回期限 → 項目名は index 3
    const names = rows.map((row) => within(row).getAllByRole("cell")[3]?.textContent);
    // item-a(2000-01-01) が item-b(2000-06-01) より先
    expect(names).toEqual(["A校正", "B点検"]);
  });

  it("行クリックで機器詳細へ遷移する(D-026)", async () => {
    const user = userEvent.setup();
    seedActionScenario();
    renderDashboardWithRoutes();

    await user.click(screen.getByRole("row", { name: /A校正/u }));

    expect(screen.getByText(`機器詳細:${equipment1.id}`)).toBeInTheDocument();
  });

  it("行フォーカス + Enter で機器詳細へ遷移する(D-026)", async () => {
    const user = userEvent.setup();
    seedActionScenario();
    renderDashboardWithRoutes();

    screen.getByRole("row", { name: /A校正/u }).focus();
    await user.keyboard("{Enter}");

    expect(screen.getByText(`機器詳細:${equipment1.id}`)).toBeInTheDocument();
  });

  it("行フォーカス + Space で機器詳細へ遷移する(D-026)", async () => {
    const user = userEvent.setup();
    seedActionScenario();
    renderDashboardWithRoutes();

    screen.getByRole("row", { name: /B点検/u }).focus();
    await user.keyboard(" ");

    expect(screen.getByText(`機器詳細:${equipment1.id}`)).toBeInTheDocument();
  });
});

describe("Dashboard: 最新の通知", () => {
  const overdueNotification: Notification = {
    id: "notif-1",
    type: NOTIFICATION_TYPE.OVERDUE,
    targetType: NOTIFICATION_TARGET_TYPE.SERVICE_ITEM,
    targetId: overdueServiceItemA.id,
    personId: tanaka.id,
    message: "EQ-001 年次校正が期限超過",
    createdDate: "2026-07-01",
    isRead: false,
  };

  it("種別バッジ・message・createdDate を描画する", () => {
    seedStore({ notifications: { [overdueNotification.id]: overdueNotification } });
    renderDashboardWithRoutes();

    expect(screen.getByText("EQ-001 年次校正が期限超過")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01")).toBeInTheDocument();
    expect(screen.getByText("期限超過")).toBeInTheDocument(); // NOTIFICATION_TYPE_LABELS[overdue]
  });

  it("アイコングリフを aria-hidden 付きで描画し、ラベルはスクリーンリーダーから読める", () => {
    seedStore({ notifications: { [overdueNotification.id]: overdueNotification } });
    renderDashboardWithRoutes();

    // アイコングリフ自体は装飾のためスクリーンリーダーから隠す(overdue = 🔴)
    expect(screen.getByText("🔴")).toHaveAttribute("aria-hidden", "true");
    // ラベルは別要素(別テキストノード)であり aria-hidden を持たない
    expect(screen.getByText("期限超過")).not.toHaveAttribute("aria-hidden");
  });

  it("「通知センターへ」で通知センターへ遷移する", async () => {
    const user = userEvent.setup();
    seedStore({ notifications: { [overdueNotification.id]: overdueNotification } });
    renderDashboardWithRoutes();

    await user.click(screen.getByRole("link", { name: "通知センターへ" }));

    expect(screen.getByText("通知センター画面")).toBeInTheDocument();
  });
});

describe("Dashboard: 空状態", () => {
  it("要対応0件は 🎉 の空状態を表示する", () => {
    seedStore({
      persons: { [tanaka.id]: tanaka },
      equipment: { [equipment1.id]: equipment1 },
      serviceItems: { [okServiceItem.id]: okServiceItem },
    });
    renderDashboardWithRoutes();

    expect(screen.getByText("対応が必要な項目はありません")).toBeInTheDocument();
  });

  it("通知0件は「新しい通知はありません」を表示する", () => {
    renderDashboardWithRoutes();

    expect(screen.getByText("新しい通知はありません")).toBeInTheDocument();
  });
});
