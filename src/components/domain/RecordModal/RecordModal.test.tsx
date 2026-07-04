/**
 * RecordModal: 実施記録登録モーダルの検証（screen-design/07-record-modal.md）。
 * 対象固定表示・doneBy プリフィル3分岐(D-017)・既定実施日・fail 注意書き・未来日警告(D-016)・
 * 登録カスケード・addRecord no-op 時のエラー維持・バリデーションを扱う。
 */

import { RecordModal } from "@/components/domain/RecordModal";
import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  SERVICE_ITEM_TYPE,
  ORDER_STATUS,
  RECORD_RESULT,
  type ServiceOrder,
  type Equipment,
  type ServiceItem,
  type Person,
  type Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { todayIsoDate } from "@/utils/time";
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

/** 項目の校正依頼先（external プリフィルの検証用） */
const serviceItemVendor: Vendor = {
  id: "vendor-item",
  name: "ミツトヨ校正センター",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 20,
};

/** 案件の依頼先（order 経由プリフィルが serviceItem 側でなく order 側の業者名になることの検証用） */
const orderVendor: Vendor = {
  id: "vendor-order",
  name: "校正ラボ東京",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 15,
};

const person: Person = {
  id: "person-1",
  name: "田中",
  email: "tanaka@example.com",
  isActive: true,
};

/** 外部項目（doneBy プリフィルが serviceItem の業者名になる） */
const serviceItemExternal: ServiceItem = {
  id: "item-external",
  equipmentId: equipment.id,
  type: SERVICE_ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: CYCLE.Y1,
  execution: EXECUTION.EXTERNAL,
  vendorId: serviceItemVendor.id,
  leadTimeDays: 20,
  bufferDays: 10,
  personId: person.id,
  noticeDaysBefore: 25,
  nextDueDate: "2030-01-01",
  isActive: true,
};

/** 内部項目（doneBy プリフィルが空欄になる） */
const serviceItemInternal: ServiceItem = {
  id: "item-internal",
  equipmentId: equipment.id,
  type: SERVICE_ITEM_TYPE.INSPECTION,
  name: "月次点検",
  cycle: CYCLE.M1,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: person.id,
  noticeDaysBefore: 30,
  nextDueDate: "2030-01-01",
  isActive: true,
};

/** returned 案件（completed へ遷移可能）。order 経由起動の正常系 */
const orderReturned: ServiceOrder = {
  id: "order-returned",
  serviceItemId: serviceItemExternal.id,
  vendorId: orderVendor.id,
  status: ORDER_STATUS.RETURNED,
};

/** planned 案件（completed へ遷移不可）。addRecord が null を返す異常系の検証用 */
const orderPlanned: ServiceOrder = {
  id: "order-planned",
  serviceItemId: serviceItemExternal.id,
  vendorId: orderVendor.id,
  status: ORDER_STATUS.PLANNED,
};

/** 機器・業者・担当者・両項目・両案件をストアへ投入する共通シード */
const seedRecordModalStore = (): void => {
  seedStore({
    equipment: { [equipment.id]: equipment },
    vendors: {
      [serviceItemVendor.id]: serviceItemVendor,
      [orderVendor.id]: orderVendor,
    },
    persons: { [person.id]: person },
    serviceItems: {
      [serviceItemExternal.id]: serviceItemExternal,
      [serviceItemInternal.id]: serviceItemInternal,
    },
    orders: {
      [orderReturned.id]: orderReturned,
      [orderPlanned.id]: orderPlanned,
    },
  });
};

beforeEach(() => {
  setupStoreIsolation();
  seedRecordModalStore();
});

const recordsOf = (): ReturnType<typeof useAppStore.getState>["records"] =>
  useAppStore.getState().records;

describe("RecordModal", () => {
  it("対象が「対象:管理番号 機器名 / 項目名」で固定表示される", () => {
    renderWithStore(
      <RecordModal
        open
        serviceItemId={serviceItemExternal.id}
        onClose={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByText("対象:EQ-001 ノギス / 年次校正")).toBeInTheDocument();
  });

  it("項目が解決できない場合でも例外を投げず defensive 表示になる", () => {
    renderWithStore(<RecordModal open serviceItemId="missing" onClose={vi.fn<() => void>()} />);
    expect(screen.getByText("対象:(項目情報が見つかりません)")).toBeInTheDocument();
  });

  it("実施日の既定値は今日", () => {
    renderWithStore(
      <RecordModal
        open
        serviceItemId={serviceItemExternal.id}
        onClose={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByLabelText("実施日", { exact: false })).toHaveValue(todayIsoDate());
  });

  it("doneBy プリフィル: order 経由起動は案件の業者名", () => {
    renderWithStore(
      <RecordModal
        open
        serviceItemId={serviceItemExternal.id}
        orderId={orderReturned.id}
        onClose={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByLabelText("実施者", { exact: false })).toHaveValue(orderVendor.name);
  });

  it("doneBy プリフィル: external 項目(order なし)は項目の業者名", () => {
    renderWithStore(
      <RecordModal
        open
        serviceItemId={serviceItemExternal.id}
        onClose={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByLabelText("実施者", { exact: false })).toHaveValue(
      serviceItemVendor.name,
    );
  });

  it("doneBy プリフィル: internal 項目は空欄", () => {
    renderWithStore(
      <RecordModal
        open
        serviceItemId={serviceItemInternal.id}
        onClose={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByLabelText("実施者", { exact: false })).toHaveValue("");
  });

  it("order 経由起動時は案件連携の説明が表示される", () => {
    renderWithStore(
      <RecordModal
        open
        serviceItemId={serviceItemExternal.id}
        orderId={orderReturned.id}
        onClose={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByText(/案件連携/u)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(orderVendor.name, "u"))).toBeInTheDocument();
  });

  it("fail 選択時に「次回期限は更新されません」の注意書きが表示される", async () => {
    const user = userEvent.setup();
    renderWithStore(
      <RecordModal
        open
        serviceItemId={serviceItemExternal.id}
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.queryByText("次回期限は更新されません")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("不合格"));
    expect(screen.getByText("次回期限は更新されません")).toBeInTheDocument();
  });

  it("未来日を入力すると警告を表示するが登録はブロックしない", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    renderWithStore(
      <RecordModal open serviceItemId={serviceItemExternal.id} onClose={onClose} />,
    );

    const doneDateField = screen.getByLabelText("実施日", { exact: false });
    await user.clear(doneDateField);
    await user.type(doneDateField, "2099-12-31");
    expect(screen.getByText("実施日が未来日です")).toBeInTheDocument();

    await user.click(screen.getByLabelText("合格"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(Object.values(recordsOf())).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pass 登録でストアに記録が追加され onClose される", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    renderWithStore(
      <RecordModal open serviceItemId={serviceItemExternal.id} onClose={onClose} />,
    );

    await user.click(screen.getByLabelText("合格"));
    await user.type(screen.getByLabelText("備考", { exact: false }), "証明書#A-102");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const records = Object.values(recordsOf());
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      serviceItemId: serviceItemExternal.id,
      doneDate: todayIsoDate(),
      doneBy: serviceItemVendor.name,
      result: RECORD_RESULT.PASS,
      note: "証明書#A-102",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("addRecord が no-op(null)の場合はエラーを表示しモーダルを閉じない", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    // planned 案件は completed へ遷移不可のため addRecord は null を返す（D-005）
    renderWithStore(
      <RecordModal
        open
        serviceItemId={serviceItemExternal.id}
        orderId={orderPlanned.id}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByLabelText("合格"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      screen.getByText("登録できませんでした。データの状態を確認してください"),
    ).toBeInTheDocument();
    expect(Object.values(recordsOf())).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("実施者が空のまま登録するとエラーが表示されストアが変化しない", async () => {
    const user = userEvent.setup();
    renderWithStore(
      <RecordModal
        open
        serviceItemId={serviceItemInternal.id}
        onClose={vi.fn<() => void>()}
      />,
    );

    await user.click(screen.getByLabelText("合格"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("実施者は必須です")).toBeInTheDocument();
    expect(Object.values(recordsOf())).toHaveLength(0);
  });

  it("結果未選択で登録するとエラーが表示されストアが変化しない", async () => {
    const user = userEvent.setup();
    renderWithStore(
      <RecordModal
        open
        serviceItemId={serviceItemExternal.id}
        onClose={vi.fn<() => void>()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("結果を選択してください")).toBeInTheDocument();
    expect(Object.values(recordsOf())).toHaveLength(0);
  });
});
