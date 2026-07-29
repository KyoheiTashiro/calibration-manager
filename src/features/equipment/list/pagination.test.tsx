/**
 * 機器一覧の共通ページネーション適用(screen-design/README.md §0.8 D-076)。
 * 既定20件・10/20/50切替・検索/フィルタ変更で1ページ目へ戻る挙動を検証する。
 */

import { EquipmentList } from "@/features/equipment/list";
import { EQUIPMENT_STATUS, type Equipment } from "@/store/types";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const TOTAL_EQUIPMENT_COUNT = 25;

const buildEquipmentList = (): Record<string, Equipment> => {
  const equipmentList: Record<string, Equipment> = {};
  for (let index = 1; index <= TOTAL_EQUIPMENT_COUNT; index += 1) {
    const managementNo = `EQ-${String(index).padStart(3, "0")}`;
    equipmentList[managementNo] = {
      id: managementNo,
      managementNo,
      name: `検査機器${String(index).padStart(3, "0")}`,
      status: EQUIPMENT_STATUS.ACTIVE,
    };
  }
  return equipmentList;
};

const getBodyRowCount = (): number => screen.getAllByRole("row").length - 1;

beforeEach(setupStoreIsolation);

describe("EquipmentList: ページネーション", () => {
  it("21件以上のとき1ページ目は20件のみ表示し、ページネーションを表示する", () => {
    seedStore({ equipment: buildEquipmentList() });
    renderWithStore(<EquipmentList />);

    expect(getBodyRowCount()).toBe(20);
    expect(screen.getByText("EQ-001")).toBeInTheDocument();
    expect(screen.queryByText("EQ-021")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "ページネーション" })).toBeInTheDocument();
  });

  it("「次へ」クリックで表示行が切り替わる", async () => {
    const user = userEvent.setup();
    seedStore({ equipment: buildEquipmentList() });
    renderWithStore(<EquipmentList />);

    await user.click(screen.getByRole("button", { name: "次へ" }));

    expect(getBodyRowCount()).toBe(5);
    expect(screen.queryByText("EQ-001")).not.toBeInTheDocument();
    expect(screen.getByText("EQ-021")).toBeInTheDocument();
  });

  it("検索語変更で1ページ目へ戻る", async () => {
    const user = userEvent.setup();
    seedStore({ equipment: buildEquipmentList() });
    renderWithStore(<EquipmentList />);

    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByText("EQ-021")).toBeInTheDocument();

    // 全件に一致する検索語(検索結果件数は変わらないがresetKeyは変わる)
    await user.type(screen.getByLabelText("検索"), "検査機器");

    expect(getBodyRowCount()).toBe(20);
    expect(screen.getByText("EQ-001")).toBeInTheDocument();
    expect(screen.queryByText("EQ-021")).not.toBeInTheDocument();
  });
});
