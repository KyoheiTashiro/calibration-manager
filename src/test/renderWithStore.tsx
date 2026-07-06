/**
 * 各テストファイルは `beforeEach(setupStoreIsolation)` でストア・LocalStorage を隔離する。
 */

import type { AppState } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

type RenderWithStoreOptions = {
  initialEntries?: string[];
  /** useParams 解決用 */
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

export const seedStore = (partial: Partial<AppState>): void => {
  useAppStore.setState(partial);
};

export const setupStoreIsolation = (): void => {
  useAppStore.getState().resetAll();
  localStorage.clear();
};
