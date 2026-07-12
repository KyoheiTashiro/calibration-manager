import { StatusBadge } from "@/components/domain/StatusBadge";
import { SERVICE_ITEM_STATUS, type ServiceItemStatus } from "@/domain/serviceItemStatus";
import { statusBadgeClass, statusBadgeLabel } from "@/domain/statusBadge";
import { render, screen } from "@testing-library/react";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、テストファイル側でも
// jest-domのmatcher型を明示importする（src/components/ui/Badge/Badge.test.tsx と同じ理由）。
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

const ALL_STATUSES: ServiceItemStatus[] = Object.values(SERVICE_ITEM_STATUS);

describe("StatusBadge", () => {
  it("5ステータスすべてで日本語ラベルと配色クラスを表示する", () => {
    for (const status of ALL_STATUSES) {
      const { unmount } = render(<StatusBadge status={status} />);

      const badge = screen.getByText(statusBadgeLabel(status));
      expect(badge.className).toContain("inline-flex");
      for (const expectedClassName of statusBadgeClass(status).split(" ")) {
        expect(badge.className).toContain(expectedClassName);
      }

      unmount();
    }
  });

  it("5ステータスすべてでアイコン(aria-hidden svg)を表示する", () => {
    for (const status of ALL_STATUSES) {
      const { container, unmount } = render(<StatusBadge status={status} />);

      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");

      unmount();
    }
  });
});
