/**
 * 点検校正項目一覧の共通ページネーション適用(screen-design/README.md §0.8 D-076)。
 * フィルタの真実源はURLクエリ(D-022)のため、resetKeyはsearchParams.toString()。
 * 表示対象はactive機器+isActive=true項目のみ(table.test.tsxの流儀を踏襲)。
 */

import { ServiceItemList } from "@/features/serviceItems/list";
import {
  CYCLE,
  EQUIPMENT_STATUS,
  EXECUTION,
  SERVICE_ITEM_TYPE,
  type Equipment,
  type ServiceItem,
} from "@/store/types";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const TOTAL_ITEM_COUNT = 25;

const buildFixtures = (): {
  equipment: Record<string, Equipment>;
  serviceItems: Record<string, ServiceItem>;
} => {
  const equipment: Record<string, Equipment> = {};
  const serviceItems: Record<string, ServiceItem> = {};
  for (let index = 1; index <= TOTAL_ITEM_COUNT; index += 1) {
    const managementNo = `EQ-${String(index).padStart(3, "0")}`;
    equipment[managementNo] = {
      id: managementNo,
      managementNo,
      name: `検査機器${String(index).padStart(3, "0")}`,
      status: EQUIPMENT_STATUS.ACTIVE,
    };
    const itemId = `item-${String(index).padStart(3, "0")}`;
    serviceItems[itemId] = {
      id: itemId,
      equipmentId: managementNo,
      type: SERVICE_ITEM_TYPE.INSPECTION,
      name: `定期点検${String(index).padStart(3, "0")}`,
      cycle: CYCLE.Y1,
      execution: EXECUTION.INTERNAL,
      bufferDays: 14,
      personId: "person-1",
      noticeDaysBefore: 30,
      // 昇順ソートでページ内訳が決定的になるよう年月日を連番にする
      nextDueDate: `2030-01-${String(index).padStart(2, "0")}`,
      isActive: true,
    };
  }
  return { equipment, serviceItems };
};

const getBodyRowCount = (): number => screen.getAllByRole("row").length - 1;

beforeEach(setupStoreIsolation);

describe("ServiceItemList: ページネーション", () => {
  it("21件以上のとき1ページ目は20件のみ表示し、ページネーションを表示する", () => {
    const { equipment, serviceItems } = buildFixtures();
    seedStore({ equipment, serviceItems });
    renderWithStore(<ServiceItemList />);

    expect(getBodyRowCount()).toBe(20);
    expect(screen.getByText("定期点検001")).toBeInTheDocument();
    expect(screen.queryByText("定期点検021")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "ページネーション" })).toBeInTheDocument();
  });

  it("「次へ」クリックで表示行が切り替わる", async () => {
    const user = userEvent.setup();
    const { equipment, serviceItems } = buildFixtures();
    seedStore({ equipment, serviceItems });
    renderWithStore(<ServiceItemList />);

    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(getBodyRowCount()).toBe(5);
    expect(screen.queryByText("定期点検001")).not.toBeInTheDocument();
    expect(screen.getByText("定期点検021")).toBeInTheDocument();
  });

  it("フィルタ変更で1ページ目へ戻る", async () => {
    const user = userEvent.setup();
    const { equipment, serviceItems } = buildFixtures();
    seedStore({ equipment, serviceItems });
    renderWithStore(<ServiceItemList />);

    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByText("定期点検021")).toBeInTheDocument();

    // 全件が該当する種別フィルタ(件数は変わらないがURLクエリ=resetKeyは変わる)
    await user.click(screen.getByRole("combobox", { name: "種別" }));
    await user.click(screen.getByRole("option", { name: "点検" }));

    expect(getBodyRowCount()).toBe(20);
    expect(screen.getByText("定期点検001")).toBeInTheDocument();
    expect(screen.queryByText("定期点検021")).not.toBeInTheDocument();
  });
});
