/**
 * かんばん×記録モーダルの結合シナリオ。
 * かんばん(screen-design/08-service-orders.md)→ 実施記録登録モーダル(07-service-record-modal.md)→
 * ストアカスケード(record 追加 → 期限再計算 → ServiceOrder completed 連鎖)を画面操作で貫通検証する。
 * 各モーダル・ダイアログ単体の入力検証は ServiceRecordModal.test.tsx / serviceOrders の各テストの責務。
 */

import { ServiceOrderList } from "@/features/serviceOrder";
import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  SERVICE_ITEM_TYPE,
  SERVICE_ORDER_STATUS,
  SERVICE_RECORD_RESULT,
  type ServiceOrder,
  type Equipment,
  type ServiceItem,
  type ServiceRecord,
  type Person,
  type Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { todayIsoDate } from "@/utils/time";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const vendor: Vendor = {
  id: "vendor-1",
  name: "ミツトヨ校正センター",
  isManufacturer: false,
  isCalibrator: true,
  standardLeadTimeDays: 30,
};
const person: Person = {
  id: "person-1",
  name: "田中",
  email: "tanaka@example.com",
  isActive: true,
};
const equipment: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  status: EQUIPMENT_STATUS.ACTIVE,
};
const serviceItem: ServiceItem = {
  id: "item-1",
  equipmentId: "equipment-1",
  type: SERVICE_ITEM_TYPE.CALIBRATION,
  name: "年次校正",
  cycle: CYCLE.Y1,
  execution: EXECUTION.EXTERNAL,
  vendorId: "vendor-1",
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  lastDoneDate: "2025-07-10",
  nextDueDate: "2026-07-10",
  isActive: true,
};

const seedWithServiceOrder = (serviceOrder: ServiceOrder): void => {
  seedStore({
    vendors: { [vendor.id]: vendor },
    persons: { [person.id]: person },
    equipment: { [equipment.id]: equipment },
    serviceItems: { [serviceItem.id]: serviceItem },
    serviceOrders: { [serviceOrder.id]: serviceOrder },
  });
};

const returnedServiceOrder: ServiceOrder = {
  id: "serviceOrder-1",
  serviceItemId: "item-1",
  vendorId: "vendor-1",
  status: SERVICE_ORDER_STATUS.RETURNED,
  orderedDate: "2026-06-01",
  dueDate: "2026-06-20",
  returnedDate: "2026-06-18",
};

/** 記録モーダルを開き、実施日を入力して指定の結果ラジオを選んで登録する */
const registerRecordFromReturnedCard = async (
  user: ReturnType<typeof userEvent.setup>,
  resultLabel: string,
): Promise<void> => {
  await user.click(screen.getByRole("button", { name: "記録登録" }));

  const doneDateField = screen.getByLabelText("実施日", { exact: false });
  await user.clear(doneDateField);
  await user.type(doneDateField, "2026-06-20");
  await user.click(screen.getByLabelText(resultLabel));
  await user.click(screen.getByRole("button", { name: "保存" }));
};

beforeEach(setupStoreIsolation);

describe("結合: returned 案件 → 記録登録 → カスケード", () => {
  it("pass 登録で record が serviceOrderId 付きで作成され、期限再計算と completed 連鎖が起きる", async () => {
    const user = userEvent.setup();
    seedWithServiceOrder(returnedServiceOrder);
    renderWithStore(<ServiceOrderList />);

    await registerRecordFromReturnedCard(user, "合格");

    const state = useAppStore.getState();
    const serviceRecords = Object.values(state.serviceRecords);
    expect(serviceRecords).toHaveLength(1);
    // doneBy は案件の依頼先 Vendor.name がプリフィルされ、そのまま登録される(D-017)
    expect(serviceRecords[0]).toMatchObject({
      serviceItemId: serviceItem.id,
      serviceOrderId: returnedServiceOrder.id,
      doneDate: "2026-06-20",
      doneBy: vendor.name,
      result: SERVICE_RECORD_RESULT.PASS,
    } satisfies Partial<ServiceRecord>);
    const updatedServiceItem = state.serviceItems[serviceItem.id];
    expect(updatedServiceItem.lastDoneDate).toBe("2026-06-20");
    expect(updatedServiceItem.nextDueDate).toBe("2027-06-20"); // 1Y 周期の暦月加算
    expect(state.serviceOrders[returnedServiceOrder.id].status).toBe(
      SERVICE_ORDER_STATUS.COMPLETED,
    );

    // completed は既定トグルOFFで非表示 → returned 列からカードが消える(08-service-orders.md)
    expect(screen.queryByText("EQ-001")).not.toBeInTheDocument();
  });

  it("fail 登録は nextDueDate を据え置き、lastDoneDate 更新と completed 連鎖は行う(D-015)", async () => {
    const user = userEvent.setup();
    seedWithServiceOrder(returnedServiceOrder);
    renderWithStore(<ServiceOrderList />);

    await registerRecordFromReturnedCard(user, "不合格");

    const state = useAppStore.getState();
    const updatedServiceItem = state.serviceItems[serviceItem.id];
    expect(updatedServiceItem.nextDueDate).toBe("2026-07-10"); // 据え置き
    expect(updatedServiceItem.lastDoneDate).toBe("2026-06-20"); // 実施の事実は記録(D-015)
    expect(state.serviceOrders[returnedServiceOrder.id].status).toBe(
      SERVICE_ORDER_STATUS.COMPLETED,
    );
    expect(Object.values(state.serviceRecords)[0]?.result).toBe(SERVICE_RECORD_RESULT.FAIL);
  });

  it("fail 選択時はモーダル内に「次回期限は更新されません」の注意書きが出る", async () => {
    const user = userEvent.setup();
    seedWithServiceOrder(returnedServiceOrder);
    renderWithStore(<ServiceOrderList />);

    await user.click(screen.getByRole("button", { name: "記録登録" }));
    expect(
      screen.queryByText("次回期限は更新されません", { exact: false }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("不合格"));

    expect(screen.getByText("次回期限は更新されません", { exact: false })).toBeInTheDocument();
  });
});

describe("結合: かんばんの隣接遷移チェーン planned → returned", () => {
  it("発注する(orderedDate 既定=今日)→ 校正中へ → 返却する(returnedDate)で順に遷移する", async () => {
    const user = userEvent.setup();
    seedWithServiceOrder({
      id: "serviceOrder-1",
      serviceItemId: "item-1",
      vendorId: "vendor-1",
      status: SERVICE_ORDER_STATUS.PLANNED,
    });
    renderWithStore(<ServiceOrderList />);

    // planned → ordered: 発注ダイアログ(orderedDate 既定=今日で確定)
    await user.click(screen.getByRole("button", { name: "発注する" }));
    expect(screen.getByLabelText("発注日", { exact: false })).toHaveValue(todayIsoDate());
    await user.click(screen.getByRole("button", { name: "確定" }));
    expect(useAppStore.getState().serviceOrders["serviceOrder-1"].status).toBe(
      SERVICE_ORDER_STATUS.ORDERED,
    );
    expect(useAppStore.getState().serviceOrders["serviceOrder-1"].orderedDate).toBe(todayIsoDate());

    // ordered → inCalibration: 即時遷移(入力なし)
    await user.click(screen.getByRole("button", { name: "校正中へ" }));
    expect(useAppStore.getState().serviceOrders["serviceOrder-1"].status).toBe(
      SERVICE_ORDER_STATUS.IN_CALIBRATION,
    );

    // inCalibration → returned: 返却ダイアログ(returnedDate 入力)
    await user.click(screen.getByRole("button", { name: "返却する" }));
    const returnedDateField = screen.getByLabelText("実返却日", { exact: false });
    await user.clear(returnedDateField);
    await user.type(returnedDateField, "2026-07-01");
    await user.click(screen.getByRole("button", { name: "確定" }));
    const finalServiceOrder = useAppStore.getState().serviceOrders["serviceOrder-1"];
    expect(finalServiceOrder.status).toBe(SERVICE_ORDER_STATUS.RETURNED);
    expect(finalServiceOrder.returnedDate).toBe("2026-07-01");

    // returned 列に「記録登録」導線が現れる(§7 への結節点)
    expect(screen.getByRole("button", { name: "記録登録" })).toBeInTheDocument();
  });
});
