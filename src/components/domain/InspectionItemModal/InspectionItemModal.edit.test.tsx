/**
 * InspectionItemModal: 編集モード・D-012（無効担当者の扱い）・空状態の検証（screen-design/06-inspection-item-modal.md）。
 * 新規追加モードは InspectionItemModal.test.tsx を参照（ファイル分割は eslint(max-lines) の300行上限に
 * 収めるための実装判断。テストケース数が仕様上多いため）。
 */

import { InspectionItemModal } from "@/components/domain/InspectionItemModal";
import {
  activePerson,
  anotherInactivePerson,
  calibratorVendor,
  equipment,
  existingInspectionItem,
  inactivePerson,
  manufacturerOnlyVendor,
  seedBaseMasters,
} from "@/components/domain/InspectionItemModal/inspectionItemModalFixtures";
import { EXECUTION, type InspectionItem } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(setupStoreIsolation);

describe("InspectionItemModal: 編集", () => {
  it("既存値がプリフィルされる", () => {
    seedBaseMasters();
    seedStore({ inspectionItems: { [existingInspectionItem.id]: existingInspectionItem } });
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} inspectionItem={existingInspectionItem} onClose={vi.fn()} />,
    );

    expect(screen.getByText("点検校正項目を編集")).toBeInTheDocument();
    expect(screen.getByLabelText("項目名", { exact: false })).toHaveValue("年次校正");
    expect(screen.getByLabelText("校正")).toBeChecked();
    expect(screen.getByLabelText("外部")).toBeChecked();
    expect(screen.getByLabelText("校正依頼先", { exact: false })).toHaveValue(calibratorVendor.id);
    expect(screen.getByLabelText("納期(日)", { exact: false })).toHaveValue(20);
    expect(screen.getByLabelText("発注余裕日", { exact: false })).toHaveValue(10);
    expect(screen.getByLabelText("担当者", { exact: false })).toHaveValue(activePerson.id);
    expect(screen.getByLabelText("通知開始日数", { exact: false })).toHaveValue(25);
    expect(screen.getByLabelText("次回期限", { exact: false })).toHaveValue("2026-06-01");
    expect(screen.getByLabelText("期限管理の対象にする")).toBeChecked();
    expect(
      screen.getByText("※新規のみ手入力。以降は実施記録から自動計算されます"),
    ).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("変更して保存するとupdateInspectionItemが反映され、lastDoneDateは据え置かれる", async () => {
    seedBaseMasters();
    seedStore({ inspectionItems: { [existingInspectionItem.id]: existingInspectionItem } });
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} inspectionItem={existingInspectionItem} onClose={onClose} />,
    );

    const nameField = screen.getByLabelText("項目名", { exact: false });
    await user.clear(nameField);
    await user.type(nameField, "更新後の項目名");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(useAppStore.getState().inspectionItems[existingInspectionItem.id]).toMatchObject({
      name: "更新後の項目名",
      lastDoneDate: "2025-06-01",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("外部から内部へ切り替えて保存するとvendorId/leadTimeDaysが明示的にundefinedへ更新される", async () => {
    seedBaseMasters();
    seedStore({ inspectionItems: { [existingInspectionItem.id]: existingInspectionItem } });
    const user = userEvent.setup();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} inspectionItem={existingInspectionItem} onClose={vi.fn()} />,
    );

    await user.click(screen.getByLabelText("内部"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(useAppStore.getState().inspectionItems[existingInspectionItem.id]).toMatchObject({
      execution: EXECUTION.INTERNAL,
      vendorId: undefined,
      leadTimeDays: undefined,
    });
  });

  it("D-012: 現担当が無効化済みの項目を編集すると「(無効)」付きで選択肢に現れ、他の無効担当者は現れない", () => {
    seedBaseMasters();
    seedStore({
      persons: {
        [activePerson.id]: activePerson,
        [inactivePerson.id]: inactivePerson,
        [anotherInactivePerson.id]: anotherInactivePerson,
      },
    });
    const inspectionItemWithInactivePerson: InspectionItem = { ...existingInspectionItem, personId: inactivePerson.id };
    seedStore({ inspectionItems: { [inspectionItemWithInactivePerson.id]: inspectionItemWithInactivePerson } });

    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} inspectionItem={inspectionItemWithInactivePerson} onClose={vi.fn()} />,
    );

    const personSelect = screen.getByLabelText("担当者", { exact: false });
    expect(screen.getByRole("option", { name: "鈴木(無効)" })).toBeInTheDocument();
    expect(personSelect).toHaveValue(inactivePerson.id);
    expect(screen.queryByText("佐藤(無効)")).not.toBeInTheDocument();
    expect(screen.queryByText("佐藤")).not.toBeInTheDocument();
  });
});

describe("InspectionItemModal: 空状態", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("外部選択時にisCalibrator=trueのVendorが0件だと文言とVendorList導線が表示される", async () => {
    seedStore({
      equipment: { [equipment.id]: equipment },
      vendors: { [manufacturerOnlyVendor.id]: manufacturerOnlyVendor },
      persons: { [activePerson.id]: activePerson },
    });
    const user = userEvent.setup();
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

    await user.click(screen.getByLabelText("外部"));

    expect(screen.getByText("校正業者が未登録です")).toBeInTheDocument();
    const vendorLink = screen.getByRole("link", { name: "メーカー/取引先マスタへ" });
    expect(vendorLink).toHaveAttribute("href", "/vendors");
  });

  it("isActive=trueのPersonが0件だと文言とPersonList導線が表示される", () => {
    seedStore({
      equipment: { [equipment.id]: equipment },
      vendors: { [calibratorVendor.id]: calibratorVendor },
      persons: {},
    });
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

    expect(screen.getByText("有効な担当者がいません")).toBeInTheDocument();
    const personLink = screen.getByRole("link", { name: "担当者マスタへ" });
    expect(personLink).toHaveAttribute("href", "/persons");
  });
});
