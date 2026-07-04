import { SERVICE_ITEM_STATUS, type ServiceItemStatus } from "@/domain/serviceItemStatus";
import { statusBadgeClass, statusBadgeLabel } from "@/domain/statusBadge";
import { describe, expect, it } from "vitest";

const ALL_STATUSES: ServiceItemStatus[] = Object.values(SERVICE_ITEM_STATUS);

describe("statusBadgeLabel（screen-design/README.md §0.3）", () => {
  it("5ステータスすべてに日本語ラベルを返す", () => {
    expect(statusBadgeLabel(SERVICE_ITEM_STATUS.OVERDUE)).toBe("期限切れ");
    expect(statusBadgeLabel(SERVICE_ITEM_STATUS.ORDER_NOW)).toBe("要発注");
    expect(statusBadgeLabel(SERVICE_ITEM_STATUS.IN_PROGRESS)).toBe("校正中");
    expect(statusBadgeLabel(SERVICE_ITEM_STATUS.DUE_SOON)).toBe("期限接近");
    expect(statusBadgeLabel(SERVICE_ITEM_STATUS.OK)).toBe("正常");
  });
});

describe("statusBadgeClass（ui-guidelines.md §4 のトークン）", () => {
  it("赤/橙/青/黄/緑の -100 背景 × -800 文字 × -300 枠線を返す", () => {
    expect(statusBadgeClass(SERVICE_ITEM_STATUS.OVERDUE)).toBe(
      "bg-red-100 text-red-800 border border-red-300",
    );
    expect(statusBadgeClass(SERVICE_ITEM_STATUS.ORDER_NOW)).toBe(
      "bg-orange-100 text-orange-800 border border-orange-300",
    );
    expect(statusBadgeClass(SERVICE_ITEM_STATUS.IN_PROGRESS)).toBe(
      "bg-blue-100 text-blue-800 border border-blue-300",
    );
    expect(statusBadgeClass(SERVICE_ITEM_STATUS.DUE_SOON)).toBe(
      "bg-yellow-100 text-yellow-800 border border-yellow-300",
    );
    expect(statusBadgeClass(SERVICE_ITEM_STATUS.OK)).toBe(
      "bg-green-100 text-green-800 border border-green-300",
    );
  });

  it("dueSoon（黄）は素の黄色文字ではなく濃色 yellow-800 を使う（コントラスト対策）", () => {
    expect(statusBadgeClass(SERVICE_ITEM_STATUS.DUE_SOON)).toContain("text-yellow-800");
  });

  it("クラス・ラベルとも5ステータスで重複しない", () => {
    const classes = ALL_STATUSES.map((status) => statusBadgeClass(status));
    const labels = ALL_STATUSES.map((status) => statusBadgeLabel(status));
    expect(new Set(classes).size).toBe(ALL_STATUSES.length);
    expect(new Set(labels).size).toBe(ALL_STATUSES.length);
  });
});
