import type { ServiceItem } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { setupStoreIsolation } from "@/test/renderWithStore";
import { beforeEach, describe, expect, it } from "vitest";

const buildServiceItemInput = (
  overrides: Partial<Omit<ServiceItem, "id">> = {},
): Omit<ServiceItem, "id"> => ({
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

describe("serviceItemSlice", () => {
  beforeEach(setupStoreIsolation);

  describe("addServiceItem", () => {
    it("生成したidを返し、そのidでserviceItemsに格納される", () => {
      const id = useAppStore.getState().addServiceItem(buildServiceItemInput());

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
      expect(useAppStore.getState().serviceItems[id]).toEqual({
        ...buildServiceItemInput(),
        id,
      });
    });

    it("複数追加すると異なるidが払い出され、両方とも格納される", () => {
      const firstId = useAppStore
        .getState()
        .addServiceItem(buildServiceItemInput({ name: "月次点検" }));
      const secondId = useAppStore
        .getState()
        .addServiceItem(buildServiceItemInput({ name: "半年点検" }));

      expect(firstId).not.toBe(secondId);
      expect(Object.keys(useAppStore.getState().serviceItems)).toHaveLength(2);
    });
  });

  describe("updateServiceItem", () => {
    it("指定フィールドのみ部分更新し、他フィールドは維持する", () => {
      const id = useAppStore.getState().addServiceItem(buildServiceItemInput());

      useAppStore.getState().updateServiceItem(id, { nextDueDate: "2027-01-31" });

      expect(useAppStore.getState().serviceItems[id]).toEqual({
        ...buildServiceItemInput(),
        id,
        nextDueDate: "2027-01-31",
      });
    });

    it("存在しないidを指定してもno-opで例外を投げない", () => {
      expect(() => {
        useAppStore.getState().updateServiceItem("no-such-id", { name: "何か" });
      }).not.toThrow();
      expect(useAppStore.getState().serviceItems["no-such-id"]).toBeUndefined();
    });
  });

  describe("setServiceItemActive", () => {
    it("isActiveをfalseに切り替えられる", () => {
      const id = useAppStore
        .getState()
        .addServiceItem(buildServiceItemInput({ isActive: true }));

      useAppStore.getState().setServiceItemActive(id, false);

      expect(useAppStore.getState().serviceItems[id]?.isActive).toBe(false);
    });

    it("isActiveをtrueに切り替えられる", () => {
      const id = useAppStore
        .getState()
        .addServiceItem(buildServiceItemInput({ isActive: false }));

      useAppStore.getState().setServiceItemActive(id, true);

      expect(useAppStore.getState().serviceItems[id]?.isActive).toBe(true);
    });

    it("存在しないidを指定してもno-opで例外を投げない", () => {
      expect(() => {
        useAppStore.getState().setServiceItemActive("no-such-id", true);
      }).not.toThrow();
      expect(useAppStore.getState().serviceItems["no-such-id"]).toBeUndefined();
    });
  });
});
