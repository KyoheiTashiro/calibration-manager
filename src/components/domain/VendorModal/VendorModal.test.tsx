/**
 * VendorModal の検証（screen-design/09-masters.md §9-A）。
 * addVendor/updateVendor 呼び出し・バリデーション・standardLeadTimeDaysの条件表示/クリアを扱う。
 */

import { VendorModal } from "@/components/domain/VendorModal";
import type { Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { setupStoreIsolation } from "@/test/renderWithStore";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const vendor: Vendor = {
  id: "vendor-1",
  name: "計測器メーカー",
  isManufacturer: true,
  isCalibrator: true,
  contactPerson: "山田",
  email: "yamada@example.com",
  phone: "03-1111-2222",
  standardLeadTimeDays: 30,
  note: "備考テキスト",
};

beforeEach(setupStoreIsolation);

describe("VendorModal: 新規追加", () => {
  it("タイトルが「取引先の追加」になる", () => {
    render(<VendorModal open onClose={vi.fn()} />);

    expect(screen.getByText("取引先の追加")).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("必須項目を入力して保存するとaddVendorが呼ばれストアに追加される", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<VendorModal open onClose={onClose} />);

    await user.type(screen.getByLabelText("名称", { exact: false }), "新規計測器メーカー");
    await user.click(screen.getByLabelText("メーカー"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    const createdVendors = Object.values(useAppStore.getState().vendors);
    expect(createdVendors).toHaveLength(1);
    expect(createdVendors[0]).toMatchObject({
      name: "新規計測器メーカー",
      isManufacturer: true,
      isCalibrator: false,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("名称が空のまま保存するとエラー文言が表示され保存されない", async () => {
    const user = userEvent.setup();
    render(<VendorModal open onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("名称は必須です")).toBeInTheDocument();
    expect(Object.values(useAppStore.getState().vendors)).toHaveLength(0);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("メール形式が不正だとエラー文言が表示される", async () => {
    const user = userEvent.setup();
    render(<VendorModal open onClose={vi.fn()} />);

    await user.type(screen.getByLabelText("名称", { exact: false }), "業者A");
    await user.type(screen.getByLabelText("メール"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("メールアドレスの形式が不正です")).toBeInTheDocument();
    expect(Object.values(useAppStore.getState().vendors)).toHaveLength(0);
  });

  it("メーカー・校正業者ともに未チェックだと警告文が表示される（submitは可能）", () => {
    render(<VendorModal open onClose={vi.fn()} />);

    expect(screen.getByText("メーカー・校正業者のどちらにも該当しません")).toBeInTheDocument();
  });

  it("isCalibrator未チェックの間は標準納期(日)フィールドが表示されない", () => {
    render(<VendorModal open onClose={vi.fn()} />);

    expect(screen.queryByLabelText("標準納期(日)")).not.toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("校正業者をチェックすると標準納期(日)フィールドが表示される", async () => {
    const user = userEvent.setup();
    render(<VendorModal open onClose={vi.fn()} />);

    await user.click(screen.getByLabelText("校正業者"));

    expect(screen.getByLabelText("標準納期(日)")).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("校正業者をチェックしてから外すと標準納期(日)の入力値がクリアされ保存値に含まれない", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<VendorModal open onClose={onClose} />);

    await user.type(screen.getByLabelText("名称", { exact: false }), "業者B");
    await user.click(screen.getByLabelText("校正業者"));
    await user.type(screen.getByLabelText("標準納期(日)"), "45");
    await user.click(screen.getByLabelText("校正業者"));

    expect(screen.queryByLabelText("標準納期(日)")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存" }));

    const createdVendors = Object.values(useAppStore.getState().vendors);
    expect(createdVendors).toHaveLength(1);
    expect(createdVendors[0]?.standardLeadTimeDays).toBeUndefined();
  });
});

describe("VendorModal: 編集", () => {
  it("既存値がプリフィルされる", () => {
    render(<VendorModal open vendor={vendor} onClose={vi.fn()} />);

    expect(screen.getByText("取引先の編集")).toBeInTheDocument();
    expect(screen.getByLabelText("名称", { exact: false })).toHaveValue("計測器メーカー");
    expect(screen.getByLabelText("メーカー")).toBeChecked();
    expect(screen.getByLabelText("校正業者")).toBeChecked();
    expect(screen.getByLabelText("窓口担当者")).toHaveValue("山田");
    expect(screen.getByLabelText("メール")).toHaveValue("yamada@example.com");
    expect(screen.getByLabelText("電話")).toHaveValue("03-1111-2222");
    expect(screen.getByLabelText("標準納期(日)")).toHaveValue(30);
    expect(screen.getByLabelText("備考")).toHaveValue("備考テキスト");
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("変更して保存するとupdateVendorが反映される", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    useAppStore.setState({ vendors: { [vendor.id]: vendor } });
    render(<VendorModal open vendor={vendor} onClose={onClose} />);

    const nameField = screen.getByLabelText("名称", { exact: false });
    await user.clear(nameField);
    await user.type(nameField, "更新後の名称");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(useAppStore.getState().vendors[vendor.id]).toMatchObject({
      name: "更新後の名称",
      isManufacturer: true,
      isCalibrator: true,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
