/**
 * InspectionItemModal: 新規追加モードの検証（screen-design/06-inspection-item-modal.md）。
 * 既定値・対象機器固定表示・外部ブロックの条件表示/クリア・バリデーション・addInspectionItem反映を扱う。
 * 編集モード/D-012/空状態は InspectionItemModal.edit.test.tsx を参照（ファイル分割の理由はそちら参照）。
 */

import { InspectionItemModal } from "@/components/domain/InspectionItemModal";
import {
  activePerson,
  calibratorVendor,
  equipment,
  seedBaseMasters,
} from "@/components/domain/InspectionItemModal/inspectionItemModalFixtures";
import { CYCLE, EXECUTION, INSPECTION_ITEM_TYPE } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(setupStoreIsolation);

describe("InspectionItemModal: 新規追加", () => {
  it("全フィールドが表示され、既定値が設定される(通知開始日数/有効)", () => {
    seedBaseMasters();
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

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
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

    await user.click(screen.getByLabelText("外部"));
    expect(screen.getByLabelText("発注余裕日", { exact: false })).toHaveValue(14);
  });

  it("対象機器が「管理番号 機器名」の形式で固定表示される", () => {
    seedBaseMasters();
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

    expect(screen.getByText("EQ-001 ノギス")).toBeInTheDocument();
  });

  it("実施区分が内部の既定では外部ブロック(校正依頼先/納期/発注余裕日)が非表示", () => {
    seedBaseMasters();
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

    expect(screen.queryByLabelText("校正依頼先", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("納期(日)", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("発注余裕日", { exact: false })).not.toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("外部選択で外部ブロックが表示され、内部に戻すと非表示 + vendorId/leadTimeDaysがクリアされる", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

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
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("項目名は必須です")).toBeInTheDocument();
    expect(screen.getByText("次回期限は必須です")).toBeInTheDocument();
    expect(Object.values(useAppStore.getState().inspectionItems)).toHaveLength(0);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("外部で校正依頼先未選択のまま保存するとエラーが表示される", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

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
    const onClose = vi.fn();
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
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

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
    renderWithStore(<InspectionItemModal open equipmentId={equipment.id} onClose={vi.fn()} />);

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
