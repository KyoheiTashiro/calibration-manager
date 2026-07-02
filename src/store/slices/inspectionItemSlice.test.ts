import type { InspectionItem } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { setupStoreIsolation } from "@/test/renderWithStore";
import { beforeEach, describe, expect, it } from "vitest";

const buildItemInput = (
  overrides: Partial<Omit<InspectionItem, "id">> = {},
): Omit<InspectionItem, "id"> => ({
  equipmentId: "equipment-1",
  type: "calibration",
  name: "年次校正",
  cycle: "1Y",
  execution: "internal",
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate: "2026-12-31",
  isActive: true,
  ...overrides,
});

describe("inspectionItemSlice", () => {
  beforeEach(setupStoreIsolation);

  describe("addItem", () => {
    it("生成したidを返し、そのidでitemsに格納される", () => {
      const id = useAppStore.getState().addItem(buildItemInput());

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
      expect(useAppStore.getState().items[id]).toEqual({ ...buildItemInput(), id });
    });

    it("複数追加すると異なるidが払い出され、両方とも格納される", () => {
      const firstId = useAppStore.getState().addItem(buildItemInput({ name: "月次点検" }));
      const secondId = useAppStore.getState().addItem(buildItemInput({ name: "半年点検" }));

      expect(firstId).not.toBe(secondId);
      expect(Object.keys(useAppStore.getState().items)).toHaveLength(2);
    });
  });

  describe("updateItem", () => {
    it("指定フィールドのみ部分更新し、他フィールドは維持する", () => {
      const id = useAppStore.getState().addItem(buildItemInput());

      useAppStore.getState().updateItem(id, { nextDueDate: "2027-01-31" });

      expect(useAppStore.getState().items[id]).toEqual({
        ...buildItemInput(),
        id,
        nextDueDate: "2027-01-31",
      });
    });

    it("存在しないidを指定してもno-opで例外を投げない", () => {
      expect(() => {
        useAppStore.getState().updateItem("no-such-id", { name: "何か" });
      }).not.toThrow();
      expect(useAppStore.getState().items["no-such-id"]).toBeUndefined();
    });
  });

  describe("setItemActive", () => {
    it("isActiveをfalseに切り替えられる", () => {
      const id = useAppStore.getState().addItem(buildItemInput({ isActive: true }));

      useAppStore.getState().setItemActive(id, false);

      expect(useAppStore.getState().items[id]?.isActive).toBe(false);
    });

    it("isActiveをtrueに切り替えられる", () => {
      const id = useAppStore.getState().addItem(buildItemInput({ isActive: false }));

      useAppStore.getState().setItemActive(id, true);

      expect(useAppStore.getState().items[id]?.isActive).toBe(true);
    });

    it("存在しないidを指定してもno-opで例外を投げない", () => {
      expect(() => {
        useAppStore.getState().setItemActive("no-such-id", true);
      }).not.toThrow();
      expect(useAppStore.getState().items["no-such-id"]).toBeUndefined();
    });
  });
});
