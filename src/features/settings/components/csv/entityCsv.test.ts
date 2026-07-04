import { buildEntityCsv, CSV_ENTITY_KINDS, ENTITY_CSV_SPECS } from "@/features/settings/components/csv/entityCsv";
import type { Equipment, Vendor } from "@/store/types";
import { describe, expect, it } from "vitest";

const vendorA: Vendor = {
  id: "vendor-a",
  name: "機器サービス",
  isManufacturer: true,
  isCalibrator: false,
  standardLeadTimeDays: 21,
  note: "毎年,一括発注",
};
const vendorB: Vendor = {
  id: "vendor-b",
  name: "校正ラボ",
  isManufacturer: false,
  isCalibrator: true,
};

describe("buildEntityCsv", () => {
  it("1行目に列キーのヘッダを出力する(D-028)", () => {
    const csv = buildEntityCsv("equipment", {});
    expect(csv).toBe("id,managementNo,name,model,serialNo,manufacturerId,location,status,note\r\n");
  });

  it("boolean は true/false、数値は10進文字列、undefined は空セルで出力する", () => {
    const csv = buildEntityCsv("vendors", { [vendorB.id]: vendorB });
    expect(csv.split("\r\n")[1]).toBe("vendor-b,校正ラボ,false,true,,,,,");
  });

  it("カンマを含む値は引用して出力する", () => {
    const csv = buildEntityCsv("vendors", { [vendorA.id]: vendorA });
    expect(csv.split("\r\n")[1]).toBe('vendor-a,機器サービス,true,false,,,,21,"毎年,一括発注"');
  });

  it("データ行は id 昇順で安定出力する", () => {
    const csv = buildEntityCsv("vendors", { [vendorB.id]: vendorB, [vendorA.id]: vendorA });
    const ids = csv
      .split("\r\n")
      .slice(1, 3)
      .map((line) => line.split(",")[0]);
    expect(ids).toEqual(["vendor-a", "vendor-b"]);
  });

  it("BOM は付与しない(ダウンロード時に UI 側で付ける)", () => {
    expect(buildEntityCsv("persons", {}).startsWith("\u{FEFF}")).toBe(false);
  });

  it("全種別の列定義が id 列で始まる(ユニーク検証の前提)", () => {
    for (const kind of CSV_ENTITY_KINDS) {
      expect(ENTITY_CSV_SPECS[kind].columns[0].key).toBe("id");
    }
  });

  it("エクスポート列に型上の全フィールドを含む(equipment)", () => {
    const keys = ENTITY_CSV_SPECS.equipment.columns.map((column) => column.key);
    const equipment: Equipment = { id: "e", managementNo: "m", name: "n", status: "active" };
    expect(keys).toEqual(expect.arrayContaining(Object.keys(equipment)));
  });
});
