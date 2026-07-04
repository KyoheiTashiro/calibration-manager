/**
 * OrderModal: 案件作成モーダルの検証（screen-design/08-orders.md「案件作成モーダル」）。
 * 対象表示・依頼先既定値/選択肢絞り込み・addOrder連携・D-006 no-op時のエラー表示・
 * 校正業者0件の空状態・バリデーションを扱う。起動元(項目一覧)との結線は modalLaunch.test.tsx 側の責務。
 */

import { OrderModal } from "@/components/domain/OrderModal";
import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  INSPECTION_ITEM_TYPE,
  ORDER_STATUS,
  type Equipment,
  type InspectionItem,
  type Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(setupStoreIsolation);

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
};

const manufacturerOnlyVendor: Vendor = {
  id: "vendor-2",
  name: "メーカーのみ商事",
  isManufacturer: true,
  isCalibrator: false,
};

const externalInspectionItem: InspectionItem = {
  id: "item-1",
  equipmentId: equipment.id,
  type: INSPECTION_ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: CYCLE.Y1,
  execution: EXECUTION.EXTERNAL,
  vendorId: calibratorVendor.id,
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate: "2026-08-01",
  isActive: true,
};

/** 機器・校正業者/非校正業者Vendor・対象項目(外部・vendorIdプリセット済)をストアへ投入する共通シード */
const seedBaseMasters = (): void => {
  seedStore({
    equipment: { [equipment.id]: equipment },
    vendors: {
      [calibratorVendor.id]: calibratorVendor,
      [manufacturerOnlyVendor.id]: manufacturerOnlyVendor,
    },
    inspectionItems: { [externalInspectionItem.id]: externalInspectionItem },
  });
};

describe("OrderModal", () => {
  it("対象が「対象:EQ-001 ノギス / 年次校正」の形式で固定表示される", () => {
    seedBaseMasters();
    renderWithStore(
      <OrderModal
        open
        inspectionItemId={externalInspectionItem.id}
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText("対象:EQ-001 ノギス / 年次校正")).toBeInTheDocument();
  });

  it("依頼先の既定値がinspectionItem.vendorId(isCalibratorの選択肢に存在する場合)になる", () => {
    seedBaseMasters();
    renderWithStore(
      <OrderModal
        open
        inspectionItemId={externalInspectionItem.id}
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByLabelText("校正依頼先", { exact: false })).toHaveValue(calibratorVendor.id);
  });

  it("依頼先の選択肢がisCalibrator=trueのVendorのみ", () => {
    seedBaseMasters();
    renderWithStore(
      <OrderModal
        open
        inspectionItemId={externalInspectionItem.id}
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByRole("option", { name: calibratorVendor.name })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: manufacturerOnlyVendor.name }),
    ).not.toBeInTheDocument();
  });

  it("有効な入力で「保存」を押すとaddOrderが呼ばれstatus=plannedの案件が追加されonCloseが呼ばれる", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    renderWithStore(
      <OrderModal open inspectionItemId={externalInspectionItem.id} onClose={onClose} />,
    );

    await user.type(screen.getByLabelText("返却予定日", { exact: false }), "2026-08-10");
    await user.type(screen.getByLabelText("費用", { exact: false }), "5000");
    await user.type(screen.getByLabelText("備考", { exact: false }), "定期校正");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const createdOrders = Object.values(useAppStore.getState().orders);
    expect(createdOrders).toHaveLength(1);
    expect(createdOrders[0]).toMatchObject({
      inspectionItemId: externalInspectionItem.id,
      vendorId: calibratorVendor.id,
      status: ORDER_STATUS.PLANNED,
      dueDate: "2026-08-10",
      cost: 5000,
      note: "定期校正",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("既に進行中の案件がある項目で作成するとaddOrderがnullを返しエラー表示・onClose不呼び出し・ストア件数不変", async () => {
    seedBaseMasters();
    seedStore({
      orders: {
        "order-existing": {
          id: "order-existing",
          inspectionItemId: externalInspectionItem.id,
          vendorId: calibratorVendor.id,
          status: ORDER_STATUS.ORDERED,
        },
      },
    });
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    renderWithStore(
      <OrderModal open inspectionItemId={externalInspectionItem.id} onClose={onClose} />,
    );

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("この項目には進行中の案件が既に存在します")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(Object.values(useAppStore.getState().orders)).toHaveLength(1);
  });

  it("校正業者が0件のとき空状態が表示され校正依頼先Selectが表示されない", () => {
    seedStore({
      equipment: { [equipment.id]: equipment },
      vendors: { [manufacturerOnlyVendor.id]: manufacturerOnlyVendor },
      inspectionItems: { [externalInspectionItem.id]: externalInspectionItem },
    });
    renderWithStore(
      <OrderModal
        open
        inspectionItemId={externalInspectionItem.id}
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText("校正業者が未登録です")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "メーカー/取引先マスタへ" })).toHaveAttribute(
      "href",
      "/vendors",
    );
    expect(screen.queryByLabelText("校正依頼先", { exact: false })).not.toBeInTheDocument();
  });

  it("校正依頼先未選択のまま「保存」を押すとエラー表示されストアが変化しない", async () => {
    seedStore({
      equipment: { [equipment.id]: equipment },
      vendors: {
        [calibratorVendor.id]: calibratorVendor,
        [manufacturerOnlyVendor.id]: manufacturerOnlyVendor,
      },
      inspectionItems: {
        [externalInspectionItem.id]: { ...externalInspectionItem, vendorId: undefined },
      },
    });
    const user = userEvent.setup();
    renderWithStore(
      <OrderModal
        open
        inspectionItemId={externalInspectionItem.id}
        onClose={vi.fn<() => void>()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("校正依頼先を選択してください")).toBeInTheDocument();
    expect(Object.values(useAppStore.getState().orders)).toHaveLength(0);
  });

  it("費用に負数を入力すると検証エラーが出る", async () => {
    seedBaseMasters();
    const user = userEvent.setup();
    renderWithStore(
      <OrderModal
        open
        inspectionItemId={externalInspectionItem.id}
        onClose={vi.fn<() => void>()}
      />,
    );

    await user.type(screen.getByLabelText("費用", { exact: false }), "-100");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("費用は0以上の数値で入力してください")).toBeInTheDocument();
    expect(Object.values(useAppStore.getState().orders)).toHaveLength(0);
  });
});
