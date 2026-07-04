/**
 * 機器登録・編集フォームのフォームスキーマ検証（screen-design/03-equipment-form.md）。
 * 画面経由の検証は create/edit 各 form.test.tsx が担い、ここでは manufacturerId の存在チェック
 * （vendors 参照、未指定=空文字は常に許可）をスキーマ単体で固定する。
 */

import { createEquipmentFormSchema } from "@/features/equipment/form/shared/schema";
import { EQUIPMENT_STATUS, type Vendor } from "@/store/types";
import { describe, expect, it } from "vitest";

const mitutoyo: Vendor = {
  id: "vendor-1",
  name: "ミツトヨ",
  isManufacturer: true,
  isCalibrator: false,
};

const base = {
  managementNo: "EQ-100",
  name: "ノギス",
  model: "",
  serialNo: "",
  location: "",
  status: EQUIPMENT_STATUS.ACTIVE,
  note: "",
};

describe("createEquipmentFormSchema: manufacturerId の存在チェック", () => {
  it("存在しないVendor IDを指定するとエラーになる", () => {
    const schema = createEquipmentFormSchema([], [mitutoyo]);
    const result = schema.safeParse({ ...base, manufacturerId: "does-not-exist" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("存在しないメーカーが指定されています");
    }
  });

  it("空文字の場合は未指定扱いでエラーにならない", () => {
    const schema = createEquipmentFormSchema([], [mitutoyo]);
    const result = schema.safeParse({ ...base, manufacturerId: "" });

    expect(result.success).toBe(true);
  });

  it("実在するVendor IDを指定した場合はエラーにならない", () => {
    const schema = createEquipmentFormSchema([], [mitutoyo]);
    const result = schema.safeParse({ ...base, manufacturerId: mitutoyo.id });

    expect(result.success).toBe(true);
  });
});
