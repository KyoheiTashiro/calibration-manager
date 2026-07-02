import type { Person } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { setupStoreIsolation } from "@/test/renderWithStore";
import { beforeEach, describe, expect, it } from "vitest";

const buildPersonInput = (overrides: Partial<Omit<Person, "id">> = {}): Omit<Person, "id"> => ({
  name: "山田太郎",
  email: "yamada@example.com",
  department: "品質保証部",
  isActive: true,
  ...overrides,
});

describe("personSlice", () => {
  beforeEach(setupStoreIsolation);

  describe("addPerson", () => {
    it("生成したidを返し、そのidでpersonsに格納される", () => {
      const id = useAppStore.getState().addPerson(buildPersonInput());

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
      expect(useAppStore.getState().persons[id]).toEqual({ ...buildPersonInput(), id });
    });

    it("複数追加すると異なるidが払い出され、両方とも格納される", () => {
      const firstId = useAppStore.getState().addPerson(buildPersonInput({ name: "佐藤花子" }));
      const secondId = useAppStore.getState().addPerson(buildPersonInput({ name: "鈴木一郎" }));

      expect(firstId).not.toBe(secondId);
      expect(Object.keys(useAppStore.getState().persons)).toHaveLength(2);
    });
  });

  describe("updatePerson", () => {
    it("指定フィールドのみ部分更新し、他フィールドは維持する", () => {
      const id = useAppStore.getState().addPerson(buildPersonInput());

      useAppStore.getState().updatePerson(id, { name: "山田次郎" });

      expect(useAppStore.getState().persons[id]).toEqual({
        ...buildPersonInput(),
        id,
        name: "山田次郎",
      });
    });

    it("存在しないidを指定してもno-opで例外を投げない", () => {
      expect(() => {
        useAppStore.getState().updatePerson("no-such-id", { name: "誰か" });
      }).not.toThrow();
      expect(useAppStore.getState().persons["no-such-id"]).toBeUndefined();
    });
  });

  describe("setPersonActive", () => {
    it("isActiveをfalseに切り替えられる", () => {
      const id = useAppStore.getState().addPerson(buildPersonInput({ isActive: true }));

      useAppStore.getState().setPersonActive(id, false);

      expect(useAppStore.getState().persons[id]?.isActive).toBe(false);
    });

    it("isActiveをtrueに切り替えられる", () => {
      const id = useAppStore.getState().addPerson(buildPersonInput({ isActive: false }));

      useAppStore.getState().setPersonActive(id, true);

      expect(useAppStore.getState().persons[id]?.isActive).toBe(true);
    });

    it("存在しないidを指定してもno-opで例外を投げない", () => {
      expect(() => {
        useAppStore.getState().setPersonActive("no-such-id", true);
      }).not.toThrow();
      expect(useAppStore.getState().persons["no-such-id"]).toBeUndefined();
    });
  });
});
