import { EmptyState } from "@/components/ui/EmptyState";
import { render, screen } from "@testing-library/react";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する。
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

describe("EmptyState", () => {
  it("message を表示する", () => {
    render(<EmptyState message="機器が登録されていません" />);

    expect(screen.getByText("機器が登録されていません")).toBeInTheDocument();
  });

  it("icon 指定時にアイコンが表示される", () => {
    render(
      <EmptyState message="機器が登録されていません" icon={<svg data-testid="empty-icon" />} />,
    );

    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
  });

  it("action 指定時にアクションが表示される", () => {
    render(
      <EmptyState
        message="機器が登録されていません"
        action={<button type="button">機器を登録</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "機器を登録" })).toBeInTheDocument();
  });
});
