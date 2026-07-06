import { parseCsv, serializeCsv } from "@/utils/csv";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

const rowArb = fc.array(fc.string(), { minLength: 1, maxLength: 8 });
const rowsArb = fc.array(rowArb, { maxLength: 20 });

describe("serializeCsv / parseCsv ラウンドトリップ", () => {
  it("任意のセル二次元配列を直列化してパースすると元に戻る", () => {
    fc.assert(
      fc.property(rowsArb, (rows) => {
        expect(parseCsv(serializeCsv(rows))).toEqual(rows);
      }),
    );
  });
});
