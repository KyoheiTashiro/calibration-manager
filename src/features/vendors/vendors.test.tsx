/**
 * VendorList（/vendors）の検証（screen-design/09-masters.md §9-A）。
 * 一覧表示・空状態・追加・編集・削除ガード（参照あり/なし）を扱う
 * （バリデーション詳細はVendorModal.test.tsxで担保）。
 */

import { VendorList } from "@/features/vendors";
import { EQUIPMENT_STATUS, type Equipment, type Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const manufacturerVendor: Vendor = {
  id: "vendor-1",
  name: "ミツトヨ",
  isManufacturer: true,
  isCalibrator: true,
  contactPerson: "山田",
  phone: "03-1111-2222",
  standardLeadTimeDays: 30,
};

const calibratorOnlyVendor: Vendor = {
  id: "vendor-2",
  name: "日本測器",
  isManufacturer: false,
  isCalibrator: true,
};

const equipment: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  status: EQUIPMENT_STATUS.ACTIVE,
  manufacturerId: manufacturerVendor.id,
};

beforeEach(setupStoreIsolation);

describe("VendorList: 一覧表示", () => {
  it("複数Vendorの行内容・種別バッジを表示する", () => {
    seedStore({
      vendors: {
        [manufacturerVendor.id]: manufacturerVendor,
        [calibratorOnlyVendor.id]: calibratorOnlyVendor,
      },
    });
    renderWithStore(<VendorList />);

    const mitutoyoRow = screen.getByRole("row", { name: /ミツトヨ/u });
    expect(within(mitutoyoRow).getByText("メーカー")).toBeInTheDocument();
    expect(within(mitutoyoRow).getByText("校正業者")).toBeInTheDocument();
    expect(within(mitutoyoRow).getByText("30日")).toBeInTheDocument();
    expect(within(mitutoyoRow).getByText("山田")).toBeInTheDocument();
    expect(within(mitutoyoRow).getByText("03-1111-2222")).toBeInTheDocument();

    // なぜ3件か: 標準納期(未設定)・窓口(未設定)・連絡先(未設定)の3列が「—」になる
    const nihonSokkiRow = screen.getByRole("row", { name: /日本測器/u });
    expect(within(nihonSokkiRow).getByText("校正業者")).toBeInTheDocument();
    expect(within(nihonSokkiRow).queryByText("メーカー")).not.toBeInTheDocument();
    expect(within(nihonSokkiRow).getAllByText("—")).toHaveLength(3);
  });
});

describe("VendorList: 空状態", () => {
  it("0件時にEmptyStateとCTAを表示する", () => {
    renderWithStore(<VendorList />);

    expect(screen.getByText("取引先が未登録です")).toBeInTheDocument();
    // なぜ2件か: ヘッダ右上の「+ 追加」と EmptyState 内の CTA の両方が表示される
    expect(screen.getAllByRole("button", { name: "+ 追加" })).toHaveLength(2);
  });
});

describe("VendorList: 追加", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("モーダルから入力・保存するとストアに追加され一覧に反映される", async () => {
    const user = userEvent.setup();
    renderWithStore(<VendorList />);

    // なぜ先頭要素か: 0件時はヘッダと EmptyState CTA の2つの「+ 追加」があり、ヘッダ側を押す
    const [headerAddButton] = screen.getAllByRole("button", { name: "+ 追加" });
    if (!headerAddButton) throw new Error("追加ボタンが見つかりません");
    await user.click(headerAddButton);
    const modalTitle = screen.getByText("取引先を追加");
    const dialogElement = modalTitle.closest("dialog");
    if (!dialogElement) throw new Error("dialog要素が見つかりません");
    expect(dialogElement).toHaveAttribute("open");

    await user.type(screen.getByLabelText("名称", { exact: false }), "エー・アンド・デイ");
    await user.click(screen.getByLabelText("メーカー"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(dialogElement).not.toHaveAttribute("open");
    expect(screen.getByRole("row", { name: /エー・アンド・デイ/u })).toBeInTheDocument();
  });
});

describe("VendorList: 編集", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("プリフィルされた値を変更して保存すると一覧に反映される", async () => {
    const user = userEvent.setup();
    seedStore({ vendors: { [manufacturerVendor.id]: manufacturerVendor } });
    renderWithStore(<VendorList />);

    await user.click(screen.getByRole("button", { name: "編集" }));
    expect(screen.getByLabelText("名称", { exact: false })).toHaveValue("ミツトヨ");

    const nameField = screen.getByLabelText("名称", { exact: false });
    await user.clear(nameField);
    await user.type(nameField, "ミツトヨ株式会社");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByRole("row", { name: /ミツトヨ株式会社/u })).toBeInTheDocument();
  });
});

describe("VendorList: 削除ガード", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("Equipment.manufacturerIdから参照中は削除できない旨を表示し削除されない", async () => {
    const user = userEvent.setup();
    seedStore({
      vendors: { [manufacturerVendor.id]: manufacturerVendor },
      equipment: { [equipment.id]: equipment },
    });
    renderWithStore(<VendorList />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.getByText("この取引先は参照されているため削除できません")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(useAppStore.getState().vendors[manufacturerVendor.id]).toBeDefined();
    expect(screen.getByRole("row", { name: /ミツトヨ/u })).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("参照なしの場合は確認ダイアログ経由で削除される", async () => {
    const user = userEvent.setup();
    seedStore({ vendors: { [manufacturerVendor.id]: manufacturerVendor } });
    renderWithStore(<VendorList />);

    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByText("この取引先を削除しますか?")).toBeInTheDocument();

    // なぜ最後の要素を選ぶか: 行内の「削除」ボタンと確認ダイアログの確定ボタンが
    // 同じアクセシブルネーム「削除」を持つため、DOM順で後（=確認ダイアログ側）を選ぶ。
    const deleteButtons = screen.getAllByRole("button", { name: "削除" });
    const confirmDeleteButton = deleteButtons.at(-1);
    if (!confirmDeleteButton) throw new Error("削除ボタンが見つかりません");
    await user.click(confirmDeleteButton);

    expect(useAppStore.getState().vendors[manufacturerVendor.id]).toBeUndefined();
    expect(screen.getByText("取引先が未登録です")).toBeInTheDocument();
  });
});
