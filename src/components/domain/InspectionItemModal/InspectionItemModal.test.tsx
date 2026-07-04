/**
 * InspectionItemModal: 新規追加モード・編集モード・D-012（無効担当者の扱い）・空状態の検証
 * （screen-design/06-inspection-item-modal.md）。
 * 新規追加は既定値・対象機器固定表示・外部ブロックの条件表示/クリア・バリデーション・addInspectionItem反映を、
 * 編集は既存値プリフィル・updateInspectionItem反映・D-012を、空状態はVendor/Person0件時の導線表示を扱う。
 */

import { InspectionItemModal } from "@/components/domain/InspectionItemModal";
import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  INSPECTION_ITEM_TYPE,
  type Equipment,
  type InspectionItem,
  type Person,
  type Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const equipment: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  status: EQUIPMENT_STATUS.ACTIVE,
};

const calibratorVendor: Vendor = {
  id: "vendor-1",
  name: "ミツトヨ校正センター",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 20,
};

const manufacturerOnlyVendor: Vendor = {
  id: "vendor-2",
  name: "メーカーのみ商事",
  isManufacturer: true,
  isCalibrator: false,
};

const activePerson: Person = {
  id: "person-1",
  name: "田中",
  email: "tanaka@example.com",
  isActive: true,
};

const inactivePerson: Person = {
  id: "person-2",
  name: "鈴木",
  email: "suzuki@example.com",
  isActive: false,
};

const anotherInactivePerson: Person = {
  id: "person-3",
  name: "佐藤",
  email: "sato@example.com",
  isActive: false,
};

const existingInspectionItem: InspectionItem = {
  id: "item-1",
  equipmentId: equipment.id,
  type: INSPECTION_ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: CYCLE.Y1,
  execution: EXECUTION.EXTERNAL,
  vendorId: calibratorVendor.id,
  leadTimeDays: 20,
  bufferDays: 10,
  personId: activePerson.id,
  noticeDaysBefore: 25,
  lastDoneDate: "2025-06-01",
  nextDueDate: "2026-06-01",
  isActive: true,
};

/** 機器・校正業者/非校正業者Vendor・有効担当者をストアへ投入する共通シード */
const seedBaseMasters = (): void => {
  seedStore({
    equipment: { [equipment.id]: equipment },
    vendors: {
      [calibratorVendor.id]: calibratorVendor,
      [manufacturerOnlyVendor.id]: manufacturerOnlyVendor,
    },
    persons: { [activePerson.id]: activePerson },
  });
};

beforeEach(setupStoreIsolation);

describe("InspectionItemModal: 新規追加", () => {
  it("全フィールドが表示され、既定値が設定される(通知開始日数/有効)", () => {
    seedBaseMasters();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

    expect(screen.getByText("点検校正項目を追加")).toBeInTheDocument();
    expect(screen.getByLabelText("項目名", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("点検")).toBeChecked();
    expect(screen.getByLabelText("校正")).not.toBeChecked();
    expect(screen.getByLabelText("周期", { exact: false })).toHaveValue(CYCLE.Y1);
    expect(screen.getByLabelText("内部")).toBeChecked();
    expect(screen.getByLabelText("外部")).not.toBeChecked();
    expect(screen.getByLabelText("担当者", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("通知開始日数", { exact: false })).toHaveValue(30);
    expect(screen.getByLabelText("次回期限", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("期限管理の対象にする")).toBeChecked();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("外部切替後に発注余裕日の既定値14が確認できる", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

    await user.click(screen.getByLabelText("外部"));
    expect(screen.getByLabelText("発注余裕日", { exact: false })).toHaveValue(14);
  });

  it("対象機器が「管理番号 機器名」の形式で固定表示される", () => {
    seedBaseMasters();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

    expect(screen.getByText("EQ-001 ノギス")).toBeInTheDocument();
  });

  it("実施区分が内部の既定では外部ブロック(校正依頼先/納期/発注余裕日)が非表示", () => {
    seedBaseMasters();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

    expect(screen.queryByLabelText("校正依頼先", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("納期(日)", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("発注余裕日", { exact: false })).not.toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("外部選択で外部ブロックが表示され、内部に戻すと非表示 + vendorId/leadTimeDaysがクリアされる", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

    await user.click(screen.getByLabelText("外部"));
    expect(screen.getByLabelText("校正依頼先", { exact: false })).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("校正依頼先", { exact: false }),
      calibratorVendor.name,
    );
    await user.type(screen.getByLabelText("納期(日)", { exact: false }), "20");

    await user.click(screen.getByLabelText("内部"));
    expect(screen.queryByLabelText("校正依頼先", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("納期(日)", { exact: false })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("外部"));
    expect(screen.getByLabelText("校正依頼先", { exact: false })).toHaveValue("");
    expect(screen.getByLabelText("納期(日)", { exact: false })).toHaveValue(null);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("必須未入力で保存するとエラーが表示されストアが変化しない", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("項目名は必須です")).toBeInTheDocument();
    expect(screen.getByText("次回期限は必須です")).toBeInTheDocument();
    expect(Object.values(useAppStore.getState().inspectionItems)).toHaveLength(0);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("外部で校正依頼先未選択のまま保存するとエラーが表示される", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

    await user.type(screen.getByLabelText("項目名", { exact: false }), "外部校正項目");
    await user.click(screen.getByLabelText("外部"));
    await user.type(screen.getByLabelText("次回期限", { exact: false }), "2026-08-01");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("校正依頼先を選択してください")).toBeInTheDocument();
    expect(Object.values(useAppStore.getState().inspectionItems)).toHaveLength(0);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("有効な入力で保存するとaddInspectionItemが呼ばれストアに反映される(internal時vendorId/leadTimeDaysはundefined)", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={onClose} />);

    await user.type(screen.getByLabelText("項目名", { exact: false }), "床上点検");
    await user.selectOptions(screen.getByLabelText("担当者", { exact: false }), activePerson.name);
    await user.type(screen.getByLabelText("次回期限", { exact: false }), "2026-08-01");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const createdInspectionItems = Object.values(useAppStore.getState().inspectionItems);
    expect(createdInspectionItems).toHaveLength(1);
    expect(createdInspectionItems[0]).toMatchObject({
      equipmentId: equipment.id,
      name: "床上点検",
      type: INSPECTION_ITEM_TYPE.INSPECTION,
      cycle: CYCLE.Y1,
      execution: EXECUTION.INTERNAL,
      vendorId: undefined,
      leadTimeDays: undefined,
      bufferDays: 14,
      personId: activePerson.id,
      noticeDaysBefore: 30,
      lastDoneDate: undefined,
      nextDueDate: "2026-08-01",
      isActive: true,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("外部 + 全項目入力で保存するとvendorId/leadTimeDays/bufferDaysが数値で反映される", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

    await user.type(screen.getByLabelText("項目名", { exact: false }), "外部校正項目");
    await user.click(screen.getByLabelText("外部"));
    await user.selectOptions(
      screen.getByLabelText("校正依頼先", { exact: false }),
      calibratorVendor.name,
    );
    await user.type(screen.getByLabelText("納期(日)", { exact: false }), "20");
    const bufferDaysField = screen.getByLabelText("発注余裕日", { exact: false });
    await user.clear(bufferDaysField);
    await user.type(bufferDaysField, "7");
    await user.selectOptions(screen.getByLabelText("担当者", { exact: false }), activePerson.name);
    await user.type(screen.getByLabelText("次回期限", { exact: false }), "2026-08-01");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const createdInspectionItems = Object.values(useAppStore.getState().inspectionItems);
    expect(createdInspectionItems).toHaveLength(1);
    expect(createdInspectionItems[0]).toMatchObject({
      execution: EXECUTION.EXTERNAL,
      vendorId: calibratorVendor.id,
      leadTimeDays: 20,
      bufferDays: 7,
    });
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("種別・周期・実施区分の選択が保存値に反映される", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

    await user.type(screen.getByLabelText("項目名", { exact: false }), "校正項目");
    await user.click(screen.getByLabelText("校正"));
    await user.selectOptions(screen.getByLabelText("周期", { exact: false }), CYCLE.M3);
    await user.click(screen.getByLabelText("外部"));
    await user.selectOptions(
      screen.getByLabelText("校正依頼先", { exact: false }),
      calibratorVendor.name,
    );
    await user.selectOptions(screen.getByLabelText("担当者", { exact: false }), activePerson.name);
    await user.type(screen.getByLabelText("次回期限", { exact: false }), "2026-08-01");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const createdInspectionItems = Object.values(useAppStore.getState().inspectionItems);
    expect(createdInspectionItems[0]).toMatchObject({
      type: INSPECTION_ITEM_TYPE.CALIBRATION,
      cycle: CYCLE.M3,
      execution: EXECUTION.EXTERNAL,
    });
  });
});

// 編集モード・D-012(無効担当者の扱い)の検証(screen-design/06-inspection-item-modal.md)。
describe("InspectionItemModal: 編集", () => {
  it("既存値がプリフィルされる", () => {
    seedBaseMasters();
    seedStore({ inspectionItems: { [existingInspectionItem.id]: existingInspectionItem } });
    renderWithStore(
      <InspectionItemModal
        open
        equipmentId={equipment.id}
        inspectionItem={existingInspectionItem}
        onClose={vi.fn<() => void>()}
      />,
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
    const onClose = vi.fn<() => void>();
    renderWithStore(
      <InspectionItemModal
        open
        equipmentId={equipment.id}
        inspectionItem={existingInspectionItem}
        onClose={onClose}
      />,
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
      <InspectionItemModal
        open
        equipmentId={equipment.id}
        inspectionItem={existingInspectionItem}
        onClose={vi.fn<() => void>()}
      />,
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
    const inspectionItemWithInactivePerson: InspectionItem = {
      ...existingInspectionItem,
      personId: inactivePerson.id,
    };
    seedStore({
      inspectionItems: { [inspectionItemWithInactivePerson.id]: inspectionItemWithInactivePerson },
    });

    renderWithStore(
      <InspectionItemModal
        open
        equipmentId={equipment.id}
        inspectionItem={inspectionItemWithInactivePerson}
        onClose={vi.fn<() => void>()}
      />,
    );

    const personSelect = screen.getByLabelText("担当者", { exact: false });
    expect(screen.getByRole("option", { name: "鈴木(無効)" })).toBeInTheDocument();
    expect(personSelect).toHaveValue(inactivePerson.id);
    expect(screen.queryByText("佐藤(無効)")).not.toBeInTheDocument();
    expect(screen.queryByText("佐藤")).not.toBeInTheDocument();
  });
});

// 空状態の検証(screen-design/06-inspection-item-modal.md)。
describe("InspectionItemModal: 空状態", () => {
  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("外部選択時にisCalibrator=trueのVendorが0件だと文言とVendorList導線が表示される", async () => {
    seedStore({
      equipment: { [equipment.id]: equipment },
      vendors: { [manufacturerOnlyVendor.id]: manufacturerOnlyVendor },
      persons: { [activePerson.id]: activePerson },
    });
    const user = userEvent.setup();
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

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
    renderWithStore(
      <InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn<() => void>()} />,
    );

    expect(screen.getByText("有効な担当者がいません")).toBeInTheDocument();
    const personLink = screen.getByRole("link", { name: "担当者マスタへ" });
    expect(personLink).toHaveAttribute("href", "/persons");
  });
});
