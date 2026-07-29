/** 一覧ページネーション（screen-design/README.md §0.8 D-076）の適用確認 */

import { VendorList } from "@/features/vendors";
import type { Vendor } from "@/store/types";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const VENDOR_SEED_COUNT = 25;

const buildVendors = (count: number): Record<string, Vendor> => {
  const vendors: Record<string, Vendor> = {};
  for (let index = 0; index < count; index += 1) {
    const id = `vendor-${String(index).padStart(2, "0")}`;
    vendors[id] = {
      id,
      name: `取引先${String(index).padStart(2, "0")}`,
      isManufacturer: false,
      isCalibrator: false,
    };
  }
  return vendors;
};

beforeEach(setupStoreIsolation);

describe("VendorList: ページネーション", () => {
  it("21件以上あるとき1ページ目には20件のみ表示され、ページネーションが表示される", () => {
    seedStore({ vendors: buildVendors(VENDOR_SEED_COUNT) });
    renderWithStore(<VendorList />);

    expect(screen.getAllByRole("row")).toHaveLength(21); // ヘッダー行 + データ20行
    expect(screen.getByRole("navigation", { name: "ページネーション" })).toBeInTheDocument();
    expect(screen.getByText(`全${VENDOR_SEED_COUNT}件中 1–20件目`)).toBeInTheDocument();
  });

  it("次へ押下でページが切り替わり表示行が変わる", async () => {
    const user = userEvent.setup();
    seedStore({ vendors: buildVendors(VENDOR_SEED_COUNT) });
    renderWithStore(<VendorList />);

    expect(screen.queryByRole("row", { name: /取引先24/u })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByRole("row", { name: /取引先24/u })).toBeInTheDocument();
    expect(screen.getByText(`全${VENDOR_SEED_COUNT}件中 21–25件目`)).toBeInTheDocument();
  });
});
