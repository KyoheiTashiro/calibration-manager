import { CSV_ENTITY_KINDS, ENTITY_CSV_SPECS } from "@/features/settings/components/csv/entityCsv";
import { describe, expect, it } from "vitest";

import { IMPORT_CHECK_COLUMNS } from "./columns";

describe("IMPORT_CHECK_COLUMNS", () => {
  it.each(CSV_ENTITY_KINDS)("%s の列順が ENTITY_CSV_SPECS の shape キー順と一致する", (kind) => {
    const columnKeys = IMPORT_CHECK_COLUMNS[kind].map((column) => column.key);
    const shapeKeys = Object.keys(ENTITY_CSV_SPECS[kind].shape);

    expect(columnKeys).toEqual(shapeKeys);
  });

  it.each(CSV_ENTITY_KINDS)("%s の全列に項目名(label)が設定されている", (kind) => {
    for (const column of IMPORT_CHECK_COLUMNS[kind]) {
      expect(column.label).not.toBe("");
    }
  });
});
