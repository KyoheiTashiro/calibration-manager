/** optional 文字列の空文字は CSV 上で「未設定」と区別できないため undefined へ正規化して比較する */

import { buildEntityCsv } from "@/features/settings/components/csv/entityCsv";
import { validateEntityCsv } from "@/features/settings/components/csv/importValidation";
import { emptyAppState } from "@/store/persistence";
import type { Person, Vendor } from "@/store/types";
import { personArb, vendorArb } from "@/test/arbitraries";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

const emptyToUndefined = (value: string | undefined): string | undefined =>
  value === "" ? undefined : value;

const normalizedVendorArb: fc.Arbitrary<Vendor> = vendorArb.map(
  (vendor): Vendor => ({
    id: vendor.id,
    name: vendor.name,
    isManufacturer: vendor.isManufacturer,
    isCalibrator: vendor.isCalibrator,
    contactPerson: emptyToUndefined(vendor.contactPerson),
    email: emptyToUndefined(vendor.email),
    phone: emptyToUndefined(vendor.phone),
    standardLeadTimeDays: vendor.standardLeadTimeDays,
    note: emptyToUndefined(vendor.note),
  }),
);

const normalizedPersonArb: fc.Arbitrary<Person> = personArb.map(
  (person): Person => ({
    id: person.id,
    name: person.name,
    email: person.email,
    department: emptyToUndefined(person.department),
    isActive: person.isActive,
  }),
);

const toRecord = <Entity extends { id: string }>(list: Entity[]): Record<string, Entity> =>
  Object.fromEntries(list.map((entity) => [entity.id, entity]));

describe("エクスポート → インポートのラウンドトリップ", () => {
  it("vendors: 任意の集合が検証を通り元の Record に戻る", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(normalizedVendorArb, { selector: (vendor) => vendor.id, maxLength: 10 }),
        (vendors) => {
          const record = toRecord(vendors);
          const result = validateEntityCsv(
            "vendors",
            buildEntityCsv("vendors", record),
            emptyAppState(),
          );
          expect(result.errors).toEqual([]);
          expect(result.entities).toEqual(record);
        },
      ),
    );
  });

  it("persons: 任意の集合が検証を通り元の Record に戻る", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(normalizedPersonArb, { selector: (person) => person.id, maxLength: 10 }),
        (persons) => {
          const record = toRecord(persons);
          const result = validateEntityCsv(
            "persons",
            buildEntityCsv("persons", record),
            emptyAppState(),
          );
          expect(result.errors).toEqual([]);
          expect(result.entities).toEqual(record);
        },
      ),
    );
  });
});
