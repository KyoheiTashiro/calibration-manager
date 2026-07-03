import { AppLayout } from "@/components/layout/AppLayout";
import { NOTIFICATION_TARGET_TYPE, NOTIFICATION_TYPE, type Notification } from "@/store/types";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

// なぜ毎回この形で描画するか: AppLayoutをレイアウトルートとして使い、
// <Outlet />経由の子ルート表示を実際のルーティングに近い形で検証するため。
const renderAppLayout = (): ReturnType<typeof renderWithStore> =>
  renderWithStore(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<div>テストコンテンツ</div>} />
      </Route>
    </Routes>,
  );

const buildNotification = (isRead: boolean): Notification => ({
  id: "notification-1",
  type: NOTIFICATION_TYPE.DUE_SOON,
  targetType: NOTIFICATION_TARGET_TYPE.ITEM,
  targetId: "item-1",
  personId: "person-1",
  message: "テスト通知",
  createdDate: "2026-07-01",
  isRead,
});

describe("AppLayout", () => {
  // なぜ必須か: Headerがstoreの未読件数を購読するため、テスト間の状態持ち越しを断つ
  beforeEach(setupStoreIsolation);

  it("サイドバーのナビゲーションリンクが8個表示されること", () => {
    renderAppLayout();

    const navigation = screen.getByRole("navigation", { name: "メインナビゲーション" });
    expect(within(navigation).getAllByRole("link")).toHaveLength(8);
  });

  it("Outlet経由で子ルートのコンテンツが表示されること", () => {
    renderAppLayout();

    expect(screen.getByText("テストコンテンツ")).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("ハンバーガーボタンをクリックするとオーバーレイが開くこと", async () => {
    const user = userEvent.setup();
    const { container } = renderAppLayout();

    expect(container.querySelector('[class*="bg-black/50"]')).toBeNull();

    await user.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(container.querySelector('[class*="bg-black/50"]')).not.toBeNull();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("オーバーレイが開いた状態でEscapeキーを押すと閉じること", async () => {
    const user = userEvent.setup();
    const { container } = renderAppLayout();

    await user.click(screen.getByRole("button", { name: "メニューを開く" }));
    expect(container.querySelector('[class*="bg-black/50"]')).not.toBeNull();

    await user.keyboard("{Escape}");

    expect(container.querySelector('[class*="bg-black/50"]')).toBeNull();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("オーバーレイが開いた状態で背景をクリックすると閉じること", async () => {
    const user = userEvent.setup();
    const { container } = renderAppLayout();

    await user.click(screen.getByRole("button", { name: "メニューを開く" }));
    const backdrop = container.querySelector('[class*="bg-black/50"]');
    expect(backdrop).not.toBeNull();

    await user.click(backdrop as Element);

    expect(container.querySelector('[class*="bg-black/50"]')).toBeNull();
  });

  it("未読通知があるとき通知バッジが表示されること", () => {
    seedStore({ notifications: { "notification-1": buildNotification(false) } });
    const { container } = renderAppLayout();

    expect(screen.getByText("未読通知1件")).toBeInTheDocument();
    expect(container.querySelector('[class*="bg-red-600"]')).not.toBeNull();
  });

  it("未読通知が0件のとき通知バッジが非表示になること", () => {
    seedStore({ notifications: { "notification-1": buildNotification(true) } });
    const { container } = renderAppLayout();

    expect(screen.getByText("未読通知なし")).toBeInTheDocument();
    expect(container.querySelector('[class*="bg-red-600"]')).toBeNull();
  });
});
