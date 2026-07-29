/**
 * 機器詳細画面の点検校正項目・実施記録テーブルへの共通ページネーション適用
 * (screen-design/README.md §0.8 D-076、04-equipment-detail.md D-078: 各テーブルへ個別適用しページ状態も独立)。
 */

import { ROUTES, equipmentDetailPath } from "@/constants/routes";
import { EquipmentDetail } from "@/features/equipment/detail";
import {
  CYCLE,
  EXECUTION,
  SERVICE_ITEM_TYPE,
  SERVICE_RECORD_RESULT,
  type ServiceItem,
  type ServiceRecord,
} from "@/store/types";
import { equipmentFull } from "@/test/equipmentDetailFixtures";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const SERVICE_ITEM_COUNT = 25;
const SERVICE_RECORD_COUNT = 25;
/** 実施記録はすべてこの項目に紐づける(項目テーブルの並び順検証には影響しない先頭項目を使う) */
const RECORD_SOURCE_ITEM_ID = "item-01";

const buildServiceItems = (): Record<string, ServiceItem> => {
  const serviceItems: Record<string, ServiceItem> = {};
  for (let index = 1; index <= SERVICE_ITEM_COUNT; index += 1) {
    const day = String(index).padStart(2, "0");
    const id = `item-${day}`;
    serviceItems[id] = {
      id,
      equipmentId: equipmentFull.id,
      type: SERVICE_ITEM_TYPE.INSPECTION,
      name: `項目${day}`,
      cycle: CYCLE.M1,
      execution: EXECUTION.INTERNAL,
      bufferDays: 14,
      personId: "person-unused",
      noticeDaysBefore: 30,
      // nextDueDate昇順ソート前提(04-equipment-detail.md): id/indexの昇順と一致させる
      nextDueDate: `2024-01-${day}`,
      isActive: true,
    };
  }
  return serviceItems;
};

const buildServiceRecords = (): Record<string, ServiceRecord> => {
  const serviceRecords: Record<string, ServiceRecord> = {};
  for (let index = 1; index <= SERVICE_RECORD_COUNT; index += 1) {
    const day = String(index).padStart(2, "0");
    const id = `record-${day}`;
    serviceRecords[id] = {
      id,
      serviceItemId: RECORD_SOURCE_ITEM_ID,
      // doneDate降順ソート前提(04-equipment-detail.md): indexが大きいほど新しい日付にする
      doneDate: `2024-06-${day}`,
      doneBy: "検査員",
      result: SERVICE_RECORD_RESULT.PASS,
    };
  }
  return serviceRecords;
};

const seedManyServiceItemsAndRecords = (): void => {
  seedStore({
    equipment: { [equipmentFull.id]: equipmentFull },
    serviceItems: buildServiceItems(),
    serviceRecords: buildServiceRecords(),
  });
};

const renderDetail = (): void => {
  renderWithStore(<EquipmentDetail />, {
    initialEntries: [equipmentDetailPath(equipmentFull.id)],
    routePath: ROUTES.EQUIPMENT_DETAIL,
  });
};

const getTables = (): { itemTable: HTMLElement; recordTable: HTMLElement } => {
  const tables = screen.getAllByRole("table");
  const itemTable = tables.at(0);
  const recordTable = tables.at(1);
  if (itemTable === undefined || recordTable === undefined) {
    throw new Error("項目・実施記録の各テーブルが見つかりません");
  }
  return { itemTable, recordTable };
};

const getNavs = (): { itemNav: HTMLElement; recordNav: HTMLElement } => {
  const navs = screen.getAllByRole("navigation", { name: "ページネーション" });
  const itemNav = navs.at(0);
  const recordNav = navs.at(1);
  if (itemNav === undefined || recordNav === undefined) {
    throw new Error("項目・実施記録の各ページネーションが見つかりません");
  }
  return { itemNav, recordNav };
};

const getDataRowCount = (table: HTMLElement): number =>
  within(table).getAllByRole("row").length - 1;

beforeEach(setupStoreIsolation);

describe("EquipmentDetail: 点検校正項目テーブルのページネーション", () => {
  beforeEach(seedManyServiceItemsAndRecords);

  it("25件のうち1ページ目は20件のみ表示し、「次へ」で残り5件に切り替わる", async () => {
    const user = userEvent.setup();
    renderDetail();

    const { itemTable } = getTables();
    expect(getDataRowCount(itemTable)).toBe(20);
    expect(within(itemTable).getByText("項目01")).toBeInTheDocument();
    expect(within(itemTable).queryByText("項目21")).not.toBeInTheDocument();

    const { itemNav } = getNavs();
    await user.click(within(itemNav).getByRole("button", { name: "次へ" }));

    expect(getDataRowCount(itemTable)).toBe(5);
    expect(within(itemTable).queryByText("項目01")).not.toBeInTheDocument();
    expect(within(itemTable).getByText("項目25")).toBeInTheDocument();
  });
});

describe("EquipmentDetail: 実施記録テーブルのページネーション", () => {
  beforeEach(seedManyServiceItemsAndRecords);

  it("25件のうち1ページ目は20件のみ表示し、「次へ」で残り5件に切り替わる", async () => {
    const user = userEvent.setup();
    renderDetail();

    const { recordTable } = getTables();
    expect(getDataRowCount(recordTable)).toBe(20);
    // doneDate降順のため、1ページ目は最新の2024-06-25を含み最古の2024-06-05は含まない
    expect(within(recordTable).getByText("2024-06-25")).toBeInTheDocument();
    expect(within(recordTable).queryByText("2024-06-05")).not.toBeInTheDocument();

    const { recordNav } = getNavs();
    await user.click(within(recordNav).getByRole("button", { name: "次へ" }));

    expect(getDataRowCount(recordTable)).toBe(5);
    expect(within(recordTable).queryByText("2024-06-25")).not.toBeInTheDocument();
    expect(within(recordTable).getByText("2024-06-05")).toBeInTheDocument();
  });
});

describe("EquipmentDetail: 2テーブルのページネーションは独立する", () => {
  beforeEach(seedManyServiceItemsAndRecords);

  it("項目テーブルのページ切替は実施記録テーブルに影響せず、その逆も同様", async () => {
    const user = userEvent.setup();
    renderDetail();

    const { itemTable, recordTable } = getTables();
    const { itemNav, recordNav } = getNavs();

    await user.click(within(itemNav).getByRole("button", { name: "次へ" }));

    // 項目テーブルは2ページ目だが、実施記録テーブルは1ページ目のまま
    expect(within(itemTable).getByText("項目25")).toBeInTheDocument();
    expect(within(recordTable).getByText("2024-06-25")).toBeInTheDocument();
    expect(within(recordTable).queryByText("2024-06-05")).not.toBeInTheDocument();

    await user.click(within(recordNav).getByRole("button", { name: "次へ" }));

    // 実施記録テーブルが2ページ目に切り替わっても、項目テーブルは2ページ目のまま維持される
    expect(within(recordTable).getByText("2024-06-05")).toBeInTheDocument();
    expect(within(itemTable).queryByText("項目01")).not.toBeInTheDocument();
    expect(within(itemTable).getByText("項目25")).toBeInTheDocument();
  });
});
