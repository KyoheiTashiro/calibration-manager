/**
 * NotificationCenter（/notifications、screen-design/10-notifications.md）の検証。
 * タブ切替・並び順（createdDate 降順/同日 id 昇順）・種別バッジ・全て既読・
 * 行クリック遷移（order/item/dangling, D-027）・空状態2種を扱う。
 */

import { ROUTES } from "@/constants/routes";
import { NotificationCenter } from "@/features/notifications";
import {
  NOTIFICATION_TARGET_TYPE,
  NOTIFICATION_TYPE,
  type Equipment,
  type InspectionItem,
  type Notification,
} from "@/store/types";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";
import { Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

/** 遷移先確認用のダミー機器詳細画面 */
const DummyEquipmentDetail = (): ReactElement => {
  const { id } = useParams();
  return <p>機器詳細:{id}</p>;
};

const equipment1: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  status: "active",
};

const item1: InspectionItem = {
  id: "item-1",
  equipmentId: "equipment-1",
  type: "inspection",
  name: "定期点検",
  cycle: "1Y",
  execution: "internal",
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate: "2026-08-20",
  isActive: true,
};

const makeNotif = (overrides: Partial<Notification> & Pick<Notification, "id">): Notification => ({
  type: NOTIFICATION_TYPE.OVERDUE,
  targetType: NOTIFICATION_TARGET_TYPE.ITEM,
  targetId: "item-1",
  personId: "person-1",
  message: "通知メッセージ",
  createdDate: "2026-07-01",
  isRead: false,
  ...overrides,
});

const renderCenter = (): void => {
  renderWithStore(
    <Routes>
      <Route path={ROUTES.NOTIFICATION_LIST} element={<NotificationCenter />} />
      <Route path={ROUTES.ORDER_LIST} element={<p>案件一覧画面</p>} />
      <Route path={ROUTES.EQUIPMENT_DETAIL} element={<DummyEquipmentDetail />} />
    </Routes>,
    { initialEntries: [ROUTES.NOTIFICATION_LIST] },
  );
};

const rowMessages = (): string[] =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "");

describe("NotificationCenter: タブと並び順", () => {
  beforeEach(setupStoreIsolation);

  it("既定は未読タブで、未読件数がタブに表示される", () => {
    seedStore({
      notifications: {
        n1: makeNotif({ id: "n1", isRead: false }),
        n2: makeNotif({ id: "n2", isRead: false }),
        r1: makeNotif({ id: "r1", isRead: true }),
      },
    });
    renderCenter();

    expect(screen.getByRole("tab", { name: "未読(2)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "既読" })).toHaveAttribute("aria-selected", "false");
  });

  it("未読タブは createdDate 降順・同日は id 昇順で並ぶ", () => {
    seedStore({
      notifications: {
        newer: makeNotif({ id: "newer", message: "新しい", createdDate: "2026-07-06" }),
        sameB: makeNotif({ id: "b", message: "同日B", createdDate: "2026-07-05" }),
        sameA: makeNotif({ id: "a", message: "同日A", createdDate: "2026-07-05" }),
      },
    });
    renderCenter();

    const messages = rowMessages();
    expect(messages[0]).toContain("新しい");
    expect(messages[1]).toContain("同日A");
    expect(messages[2]).toContain("同日B");
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("既読タブに切り替えると既読通知のみ表示する", async () => {
    const user = userEvent.setup();
    seedStore({
      notifications: {
        u1: makeNotif({ id: "u1", message: "未読メッセージ", isRead: false }),
        r1: makeNotif({ id: "r1", message: "既読メッセージ", isRead: true }),
      },
    });
    renderCenter();

    await user.click(screen.getByRole("tab", { name: "既読" }));

    expect(screen.getByText("既読メッセージ")).toBeInTheDocument();
    expect(screen.queryByText("未読メッセージ")).not.toBeInTheDocument();
  });
});

describe("NotificationCenter: 種別バッジ", () => {
  beforeEach(setupStoreIsolation);

  it("種別の日本語ラベルと色クラスを併記する", () => {
    seedStore({
      notifications: {
        d1: makeNotif({ id: "d1", type: NOTIFICATION_TYPE.DELIVERY_DUE_SOON }),
      },
    });
    renderCenter();

    const badge = screen.getByText("納期接近");
    expect(badge.className).toContain("bg-purple-100");
    expect(badge.className).toContain("text-purple-800");
  });
});

describe("NotificationCenter: 全て既読", () => {
  beforeEach(setupStoreIsolation);

  it("未読0件のときは全て既読ボタンが無効", () => {
    seedStore({ notifications: { r1: makeNotif({ id: "r1", isRead: true }) } });
    renderCenter();

    expect(screen.getByRole("button", { name: "全て既読" })).toBeDisabled();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("全て既読で未読が0になりタブ件数も0になる", async () => {
    const user = userEvent.setup();
    seedStore({
      notifications: {
        u1: makeNotif({ id: "u1", isRead: false }),
        u2: makeNotif({ id: "u2", isRead: false }),
      },
    });
    renderCenter();

    await user.click(screen.getByRole("button", { name: "全て既読" }));

    expect(screen.getByRole("tab", { name: "未読(0)" })).toBeInTheDocument();
    expect(screen.getByText("未読の通知はありません")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全て既読" })).toBeDisabled();
  });
});

describe("NotificationCenter: 行クリック遷移（D-027）", () => {
  beforeEach(setupStoreIsolation);

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("targetType=order の行クリックで案件一覧へ遷移する", async () => {
    const user = userEvent.setup();
    seedStore({
      notifications: {
        o1: makeNotif({
          id: "o1",
          type: NOTIFICATION_TYPE.DELIVERY_DUE_SOON,
          targetType: NOTIFICATION_TARGET_TYPE.ORDER,
          targetId: "order-1",
          message: "案件通知",
        }),
      },
    });
    renderCenter();

    await user.click(screen.getByRole("button", { name: /案件通知/u }));

    expect(screen.getByText("案件一覧画面")).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("targetType=item の行クリックで機器詳細へ遷移する", async () => {
    const user = userEvent.setup();
    seedStore({
      equipment: { [equipment1.id]: equipment1 },
      items: { [item1.id]: item1 },
      notifications: {
        i1: makeNotif({ id: "i1", targetId: "item-1", message: "項目通知" }),
      },
    });
    renderCenter();

    await user.click(screen.getByRole("button", { name: /項目通知/u }));

    expect(screen.getByText("機器詳細:equipment-1")).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("dangling item（項目削除済み）の行クリックは既読化のみで遷移しない", async () => {
    const user = userEvent.setup();
    seedStore({
      notifications: {
        d1: makeNotif({ id: "d1", targetId: "item-missing", message: "dangling通知" }),
      },
    });
    renderCenter();

    await user.click(screen.getByRole("button", { name: /dangling通知/u }));

    // 遷移していない（通知センターに留まる）
    expect(screen.getByRole("heading", { name: "通知センター" })).toBeInTheDocument();
    expect(screen.queryByText("機器詳細:")).not.toBeInTheDocument();
    // 既読化された（未読タブから消え、既読タブに現れる）
    expect(screen.getByText("未読の通知はありません")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "既読" }));
    expect(screen.getByText("dangling通知")).toBeInTheDocument();
  });
});

describe("NotificationCenter: 空状態", () => {
  beforeEach(setupStoreIsolation);

  it("未読0件のとき未読タブに専用メッセージを表示する", () => {
    seedStore({ notifications: { r1: makeNotif({ id: "r1", isRead: true }) } });
    renderCenter();

    expect(screen.getByText("未読の通知はありません")).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("既読0件のとき既読タブに専用メッセージを表示する", async () => {
    const user = userEvent.setup();
    seedStore({ notifications: { u1: makeNotif({ id: "u1", isRead: false }) } });
    renderCenter();

    await user.click(screen.getByRole("tab", { name: /既読/u }));

    expect(screen.getByText("既読の通知はありません")).toBeInTheDocument();
  });
});
