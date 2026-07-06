import { AppLayout } from "@/components/system/AppLayout";
import { NOTIFICATION_TARGET_TYPE, NOTIFICATION_TYPE, type Notification } from "@/store/types";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

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
  targetType: NOTIFICATION_TARGET_TYPE.SERVICE_ITEM,
  targetId: "item-1",
  personId: "person-1",
  message: "テスト通知",
  createdDate: "2026-07-01",
  isRead,
});

describe("AppLayout", () => {
  // なぜ必須か: Headerがstoreの未読件数を購読するため、テスト間の状態持ち越しを断つ
  beforeEach(setupStoreIsolation);

  it("サイドバーのナビゲーションリンクが9個表示されること", () => {
    renderAppLayout();

    const navigation = screen.getByRole("navigation", { name: "メインナビゲーション" });
    expect(within(navigation).getAllByRole("link")).toHaveLength(9);
  });

  it("Outlet経由で子ルートのコンテンツが表示されること", () => {
    renderAppLayout();

    expect(screen.getByText("テストコンテンツ")).toBeInTheDocument();
  });

  it("ハンバーガーボタンをクリックするとオーバーレイが開くこと", async () => {
    const user = userEvent.setup();
    const { container } = renderAppLayout();

    expect(container.querySelector('[class*="bg-black/50"]')).toBeNull();

    await user.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(container.querySelector('[class*="bg-black/50"]')).not.toBeNull();
  });

  it("オーバーレイが開いた状態でEscapeキーを押すと閉じること", async () => {
    const user = userEvent.setup();
    const { container } = renderAppLayout();

    await user.click(screen.getByRole("button", { name: "メニューを開く" }));
    expect(container.querySelector('[class*="bg-black/50"]')).not.toBeNull();

    await user.keyboard("{Escape}");

    expect(container.querySelector('[class*="bg-black/50"]')).toBeNull();
  });

  it("オーバーレイが開いた状態で背景をクリックすると閉じること", async () => {
    const user = userEvent.setup();
    const { container } = renderAppLayout();

    await user.click(screen.getByRole("button", { name: "メニューを開く" }));
    const backdrop = container.querySelector('[class*="bg-black/50"]');
    expect(backdrop).not.toBeNull();
    if (backdrop === null) throw new Error("backdrop要素が見つかりません");

    await user.click(backdrop);

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
