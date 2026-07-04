/**
 * useSafeNavigate の検証。
 * navigate() の戻り値（void | Promise<void>）を無視して遷移だけが実際に起きることを、
 * モックではなく MemoryRouter + Routes 上での画面遷移結果で確認する。
 */

import { useSafeNavigate } from "@/utils/navigation";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

/**
 * 遷移元("/")・遷移先("/next")の両方を1コンポーネントで表現する(react/no-multi-comp対策)。
 * 現在地は useLocation から判定し、"/" では文字列パス・オブジェクトパスへの遷移ボタンを、
 * "/next" では navigate(-1) 相当(履歴デルタ)で戻るボタンを出し分ける。
 */
const Screen = (): ReactElement => {
  const safeNavigate = useSafeNavigate();
  const location = useLocation();

  if (location.pathname === "/next") {
    return (
      <div>
        <p>次画面:{location.search === "?from=object" ? "object" : "direct"}</p>
        <button
          type="button"
          onClick={() => {
            safeNavigate(-1);
          }}
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div>
      <p>開始画面</p>
      <button
        type="button"
        onClick={() => {
          safeNavigate("/next");
        }}
      >
        文字列パスへ
      </button>
      <button
        type="button"
        onClick={() => {
          safeNavigate({ pathname: "/next", search: "?from=object" });
        }}
      >
        オブジェクトパスへ
      </button>
    </div>
  );
};

const renderWithRoutes = (initialEntries: string[]): void => {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<Screen />} />
        <Route path="/next" element={<Screen />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("useSafeNavigate", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("文字列パスへ遷移する", async () => {
    const user = userEvent.setup();
    renderWithRoutes(["/"]);

    expect(screen.getByText("開始画面")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "文字列パスへ" }));

    expect(await screen.findByText("次画面:direct")).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("オブジェクトパス(検索クエリ付き)へ遷移する", async () => {
    const user = userEvent.setup();
    renderWithRoutes(["/"]);

    await user.click(screen.getByRole("button", { name: "オブジェクトパスへ" }));

    expect(await screen.findByText("次画面:object")).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("数値(履歴デルタ)で1つ前の画面へ戻る", async () => {
    const user = userEvent.setup();
    renderWithRoutes(["/"]);

    await user.click(screen.getByRole("button", { name: "文字列パスへ" }));
    expect(await screen.findByText("次画面:direct")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "戻る" }));

    expect(await screen.findByText("開始画面")).toBeInTheDocument();
  });
});
