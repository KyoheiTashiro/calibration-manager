import App from "@/App";
import type { Notification } from "@/store/types";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

// なぜ beforeEach(setupStoreIsolation) が必須か: HeaderがunreadNotificationCountを
// 購読しており、テスト間でストア・LocalStorageの状態が持ち越されると
// 未読バッジの表示が前のテストの影響を受けてしまうため。

const buildNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: "notification-1",
  type: "dueSoon",
  targetType: "serviceItem",
  targetId: "item-1",
  personId: "person-1",
  message: "テスト通知",
  createdDate: "2026-07-01",
  isRead: false,
  ...overrides,
});

describe("主要ルートのプレースホルダ表示", () => {
  beforeEach(setupStoreIsolation);

  it.each([
    ["/", "ダッシュボード"],
    ["/equipment", "機器一覧"],
    ["/service-items", "点検校正項目一覧"],
    ["/notifications", "通知センター"],
    ["/settings", "設定"],
  ])("%s は見出し「%s」を表示する", (path, heading) => {
    renderWithStore(<App />, { initialEntries: [path] });

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });
});

describe("サイドバーのナビゲーション", () => {
  beforeEach(setupStoreIsolation);

  it("メインナビゲーションのリンクが9項目ある", () => {
    renderWithStore(<App />);

    const navigation = screen.getByRole("navigation", { name: "メインナビゲーション" });
    expect(within(navigation).getAllByRole("link")).toHaveLength(9);
  });
});

describe("未読通知バッジ", () => {
  beforeEach(setupStoreIsolation);

  it("未読通知をseedすると件数バッジを表示する", () => {
    seedStore({ notifications: { "notification-1": buildNotification() } });

    renderWithStore(<App />);

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("未読通知が0件のとき件数バッジを表示しない", () => {
    seedStore({ notifications: {} });

    renderWithStore(<App />);

    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("既読のみのときも件数バッジを表示しない", () => {
    seedStore({
      notifications: { "notification-1": buildNotification({ isRead: true }) },
    });

    renderWithStore(<App />);

    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });
});
