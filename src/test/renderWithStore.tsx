/**
 * ストア連携テストの共通ヘルパ（testing.md「テストヘルパー」）。
 * 各テストファイルは `beforeEach(setupStoreIsolation)` でストア・LocalStorage を隔離する。
 */

import type { AppState } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

type RenderWithStoreOptions = {
  /** MemoryRouter の初期履歴。省略時は ["/"] */
  initialEntries?: string[];
  /** 指定すると <Routes><Route path> で囲む（useParams 解決用） */
  routePath?: string;
};

export const renderWithStore = (
  ui: ReactElement,
  { initialEntries = ["/"], routePath }: RenderWithStoreOptions = {},
): RenderResult =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      {routePath === undefined ? (
        ui
      ) : (
        <Routes>
          <Route path={routePath} element={ui} />
        </Routes>
      )}
    </MemoryRouter>,
  );

/** zustand setState でエンティティを部分上書きしてテストデータを流し込む */
export const seedStore = (partial: Partial<AppState>): void => {
  useAppStore.setState(partial);
};

/** resetAll + localStorage.clear() でテスト間の状態持ち越しを断つ */
export const setupStoreIsolation = (): void => {
  useAppStore.getState().resetAll();
  localStorage.clear();
};
