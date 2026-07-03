/**
 * CSV インポート検証(§11、D-029 / D-030)。
 * ヘッダ一致・行単位 zod・ファイル内ユニーク・参照整合・件数集計を検証する。
 */

import { validateEntityCsv } from "@/features/settings/importValidation";
import { emptyAppState } from "@/store/persistence";
import type {
  AppState,
  CalibrationOrder,
  Equipment,
  InspectionItem,
  Person,
  Vendor,
} from "@/store/types";
import { describe, expect, it } from "vitest";

const vendor: Vendor = { id: "vendor-1", name: "校正社", isManufacturer: true, isCalibrator: true };
const person: Person = { id: "person-1", name: "田中", email: "tanaka@example.com", isActive: true };
const equipment: Equipment = {
  id: "equipment-1",
  managementNo: "EQ-001",
  name: "ノギス",
  status: "active",
};
const item: InspectionItem = {
  id: "item-1",
  equipmentId: "equipment-1",
  type: "calibration",
  name: "年次校正",
  cycle: "1Y",
  execution: "external",
  vendorId: "vendor-1",
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate: "2026-07-15",
  isActive: true,
};
const order: CalibrationOrder = {
  id: "order-1",
  itemId: "item-1",
  vendorId: "vendor-1",
  status: "ordered",
};

/** 参照整合の突合先(D-029: 現在ストアのスナップショット相当) */
const stateWithReferences = (): AppState => ({
  ...emptyAppState(),
  vendors: { [vendor.id]: vendor },
  persons: { [person.id]: person },
  equipment: { [equipment.id]: equipment },
  items: { [item.id]: item },
  orders: { [order.id]: order },
});

const EQUIPMENT_HEADER = "id,managementNo,name,model,serialNo,manufacturerId,location,status,note";
const ITEMS_HEADER =
  "id,equipmentId,type,name,cycle,execution,vendorId,leadTimeDays,bufferDays,personId,noticeDaysBefore,lastDoneDate,nextDueDate,isActive";
const NOTIFICATIONS_HEADER =
  "id,type,targetType,targetId,personId,message,createdDate,isRead";

const joinCsv = (...lines: string[]): string => `${lines.join("\r\n")}\r\n`;

describe("validateEntityCsv: 取り込み成功", () => {
  it("全行有効なら entities を返し、optional 空セルは undefined になる", () => {
    const csv = joinCsv(
      EQUIPMENT_HEADER,
      "eq-1,EQ-101,ノギスA,,,vendor-1,,active,",
      "eq-2,EQ-102,マイクロメータ,M-2,S-2,,検査室,suspended,予備",
    );
    const result = validateEntityCsv("equipment", csv, stateWithReferences());
    expect(result.errors).toEqual([]);
    expect(result.validCount).toBe(2);
    expect(result.errorRowCount).toBe(0);
    expect(result.entities).toEqual({
      "eq-1": {
        id: "eq-1",
        managementNo: "EQ-101",
        name: "ノギスA",
        manufacturerId: "vendor-1",
        status: "active",
      },
      "eq-2": {
        id: "eq-2",
        managementNo: "EQ-102",
        name: "マイクロメータ",
        model: "M-2",
        serialNo: "S-2",
        location: "検査室",
        status: "suspended",
        note: "予備",
      },
    });
  });

  it("ヘッダのみ(データ0行)は取り込み可の空 Record を返す", () => {
    const result = validateEntityCsv("equipment", joinCsv(EQUIPMENT_HEADER), emptyAppState());
    expect(result).toEqual({ validCount: 0, errorRowCount: 0, errors: [], entities: {} });
  });

  it("数値・boolean のセルをフィールド値へ変換する(items)", () => {
    const csv = joinCsv(
      ITEMS_HEADER,
      "it-1,equipment-1,inspection,月次点検,1M,internal,,,14,person-1,30,2026-06-01,2026-07-01,true",
    );
    const result = validateEntityCsv("items", csv, stateWithReferences());
    expect(result.errors).toEqual([]);
    expect(result.entities?.["it-1"]).toEqual({
      id: "it-1",
      equipmentId: "equipment-1",
      type: "inspection",
      name: "月次点検",
      cycle: "1M",
      execution: "internal",
      bufferDays: 14,
      personId: "person-1",
      noticeDaysBefore: 30,
      lastDoneDate: "2026-06-01",
      nextDueDate: "2026-07-01",
      isActive: true,
    });
  });
});

describe("validateEntityCsv: ファイル全体エラー(行1)", () => {
  it("引用符の対応が取れない CSV を拒否する", () => {
    const result = validateEntityCsv("equipment", '"broken', emptyAppState());
    expect(result.entities).toBeNull();
    expect(result.errors).toEqual([
      { line: 1, message: "CSVとして解釈できません(引用符の対応を確認してください)" },
    ]);
  });

  it("ヘッダが列定義と一致しないファイルを拒否する", () => {
    const csv = joinCsv("id,name", "eq-1,ノギス");
    const result = validateEntityCsv("equipment", csv, emptyAppState());
    expect(result.entities).toBeNull();
    expect(result.errors).toEqual([
      { line: 1, message: "ヘッダが不正です(機器のCSVではありません)" },
    ]);
    expect(result.errorRowCount).toBe(1);
  });
});

describe("validateEntityCsv: 行単位エラー", () => {
  it("列数不一致の行を報告する", () => {
    const csv = joinCsv(EQUIPMENT_HEADER, "eq-1,EQ-101,ノギスA");
    const result = validateEntityCsv("equipment", csv, emptyAppState());
    expect(result.errors).toEqual([{ line: 2, message: "列数が不正です(期待9・実際3)" }]);
  });

  it("列挙の不正値は入力値付きで報告する(§11 のプレビュー例)", () => {
    const csv = joinCsv(EQUIPMENT_HEADER, "eq-1,EQ-101,ノギスA,,,,,broken,");
    const result = validateEntityCsv("equipment", csv, emptyAppState());
    expect(result.errors).toEqual([{ line: 2, message: "status: 不正値 'broken'" }]);
  });

  it("必須文字列の空セルを報告する", () => {
    const csv = joinCsv(EQUIPMENT_HEADER, "eq-1,EQ-101,,,,,,active,");
    const result = validateEntityCsv("equipment", csv, emptyAppState());
    expect(result.errors).toEqual([{ line: 2, message: "name: 必須です" }]);
  });

  it("日付形式の不正を報告する", () => {
    const csv = joinCsv(
      ITEMS_HEADER,
      "it-1,equipment-1,inspection,月次点検,1M,internal,,,14,person-1,30,,2026/07/01,true",
    );
    const result = validateEntityCsv("items", csv, stateWithReferences());
    expect(result.errors).toEqual([
      { line: 2, message: "nextDueDate: YYYY-MM-DD形式の日付ではありません" },
    ]);
  });

  it("数値セルに解釈できない値を報告する", () => {
    const csv = joinCsv(
      ITEMS_HEADER,
      "it-1,equipment-1,inspection,月次点検,1M,internal,,,abc,person-1,30,,2026-07-01,true",
    );
    const result = validateEntityCsv("items", csv, stateWithReferences());
    expect(result.errors).toEqual([{ line: 2, message: "bufferDays: 数値を指定してください" }]);
  });

  it("boolean セルに true/false 以外の値を報告する", () => {
    const csv = joinCsv(
      ITEMS_HEADER,
      "it-1,equipment-1,inspection,月次点検,1M,internal,,,14,person-1,30,,2026-07-01,yes",
    );
    const result = validateEntityCsv("items", csv, stateWithReferences());
    expect(result.errors).toEqual([
      { line: 2, message: "isActive: true/false のいずれかを指定してください" },
    ]);
  });

  it("external なのに vendorId が空の行を報告する(schema.ts の相関制約)", () => {
    const csv = joinCsv(
      ITEMS_HEADER,
      "it-1,equipment-1,calibration,年次校正,1Y,external,,,14,person-1,30,,2026-07-01,true",
    );
    const result = validateEntityCsv("items", csv, stateWithReferences());
    expect(result.errors).toEqual([
      { line: 2, message: "vendorId: 外部実施の項目には校正依頼先が必要です" },
    ]);
  });
});

describe("validateEntityCsv: ファイル内ユニーク制約", () => {
  it("id の重複を初出行番号付きで報告する", () => {
    const csv = joinCsv(
      EQUIPMENT_HEADER,
      "eq-1,EQ-101,ノギスA,,,,,active,",
      "eq-1,EQ-102,ノギスB,,,,,active,",
    );
    const result = validateEntityCsv("equipment", csv, emptyAppState());
    expect(result.errors).toEqual([
      { line: 3, message: "id: 重複しています(行2と同じ値)" },
    ]);
  });

  it("equipment は managementNo の重複も報告する(§11 のプレビュー例)", () => {
    const csv = joinCsv(
      EQUIPMENT_HEADER,
      "eq-1,EQ-101,ノギスA,,,,,active,",
      "eq-2,EQ-101,ノギスB,,,,,active,",
    );
    const result = validateEntityCsv("equipment", csv, emptyAppState());
    expect(result.errors).toEqual([
      { line: 3, message: "managementNo: 重複しています(行2と同じ値)" },
    ]);
  });
});

describe("validateEntityCsv: 参照整合(D-029: 現在ストアと突合)", () => {
  it("equipment.manufacturerId の参照先不存在を報告する", () => {
    const csv = joinCsv(EQUIPMENT_HEADER, "eq-1,EQ-101,ノギスA,,,vendor-9,,active,");
    const result = validateEntityCsv("equipment", csv, emptyAppState());
    expect(result.errors).toEqual([
      { line: 2, message: "manufacturerId: 参照先が存在しません 'vendor-9'" },
    ]);
  });

  it("items の equipmentId / personId の参照先不存在を1行で複数報告する", () => {
    const csv = joinCsv(
      ITEMS_HEADER,
      "it-1,equipment-9,inspection,月次点検,1M,internal,,,14,person-9,30,,2026-07-01,true",
    );
    const result = validateEntityCsv("items", csv, stateWithReferences());
    expect(result.errors).toEqual([
      { line: 2, message: "equipmentId: 参照先が存在しません 'equipment-9'" },
      { line: 2, message: "personId: 参照先が存在しません 'person-9'" },
    ]);
    expect(result.errorRowCount).toBe(1);
  });

  it("notifications は targetType に応じて items / orders と突合する", () => {
    // targetType=order だが targetId は item の id → orders に存在しないためエラー
    const csv = joinCsv(
      NOTIFICATIONS_HEADER,
      "nt-1,dueSoon,order,item-1,person-1,期限接近,2026-07-01,false",
      "nt-2,dueSoon,item,item-1,person-1,期限接近,2026-07-01,true",
    );
    const result = validateEntityCsv("notifications", csv, stateWithReferences());
    expect(result.errors).toEqual([
      { line: 2, message: "targetId: 参照先が存在しません 'item-1'" },
    ]);
    expect(result.validCount).toBe(1);
  });

  it("records の orderId は指定時のみ突合する", () => {
    const csv = joinCsv(
      "id,itemId,doneDate,doneBy,result,orderId,note",
      "rc-1,item-1,2026-07-01,田中,pass,,",
      "rc-2,item-1,2026-07-01,校正社,pass,order-9,",
    );
    const result = validateEntityCsv("records", csv, stateWithReferences());
    expect(result.errors).toEqual([
      { line: 3, message: "orderId: 参照先が存在しません 'order-9'" },
    ]);
  });
});

describe("validateEntityCsv: 件数集計と取り込み可否(D-030)", () => {
  it("エラーが1件でもあれば entities は null、有効行数は維持する", () => {
    const csv = joinCsv(
      EQUIPMENT_HEADER,
      "eq-1,EQ-101,ノギスA,,,,,active,",
      "eq-2,EQ-102,ノギスB,,,,,broken,",
      "eq-3,EQ-103,ノギスC,,,,,active,",
    );
    const result = validateEntityCsv("equipment", csv, emptyAppState());
    expect(result.validCount).toBe(2);
    expect(result.errorRowCount).toBe(1);
    expect(result.entities).toBeNull();
  });
});
