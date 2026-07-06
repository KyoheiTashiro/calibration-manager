import { Settings } from "@/features/settings";
import {
  buildEntityCsv,
  CSV_ENTITY_KINDS,
  ENTITY_CSV_SPECS,
} from "@/features/settings/components/csv/entityCsv";
import { EQUIPMENT_STATUS, type Equipment, type Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { CSV_BOM } from "@/utils/csv";
import { todayIsoDate } from "@/utils/time";
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// なぜ: jsdom は Blob URL API を実装しないことがあるため、未定義時のみ土台を用意し spy で差し替える。
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = (): string => "blob:mock";
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = (): void => {
    // テスト用スタブ(何もしない)
  };
}

const sampleEquipment: Equipment = {
  id: "e1",
  managementNo: "M-001",
  name: "ノギス",
  status: EQUIPMENT_STATUS.ACTIVE,
};

const sampleVendor: Vendor = {
  id: "v1",
  name: "旧メーカー",
  isManufacturer: true,
  isCalibrator: false,
};

// なぜ holder パターンか: ダウンロード時に生成された Blob とファイル名を捕捉しつつ、
// テスト間は `{}` 再代入でリセットする(init-declarations / no-useless-undefined 回避)。
let capture: { blob?: Blob; name?: string } = {};

beforeEach(() => {
  setupStoreIsolation();
  capture = {};
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    if (blob instanceof Blob) capture.blob = blob;
    return "blob:mock";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {
    // 破棄呼び出しは副作用不要(捕捉のみ)
  });
  // なぜ: a要素の click は jsdom でナビゲーション未実装警告を出すため、ダウンロード名だけ捕捉して無効化する。
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function mockClick(this: HTMLAnchorElement) {
      capture.name = this.download;
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("エクスポート(§11)", () => {
  it("7エンティティ分のダウンロードボタンを表示する", () => {
    renderWithStore(<Settings />);
    for (const kind of CSV_ENTITY_KINDS) {
      expect(
        screen.getByRole("button", { name: ENTITY_CSV_SPECS[kind].label }),
      ).toBeInTheDocument();
    }
  });

  it("機器ボタンで BOM付き・ヘッダを含む CSV を日付付きファイル名で生成する", async () => {
    seedStore({ equipment: { e1: sampleEquipment } });
    renderWithStore(<Settings />);

    await userEvent.click(screen.getByRole("button", { name: "機器" }));

    expect(capture.blob).toBeInstanceOf(Blob);
    // なぜ ignoreBOM か: Blob.text() は UTF-8 デコード仕様で先頭 BOM を除去するため、
    // BOM 付与を検証するには生バイトを BOM 保持デコードで読む必要がある。
    if (!(capture.blob instanceof Blob)) throw new Error("blob が Blob ではありません");
    const buffer = await capture.blob.arrayBuffer();
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(buffer);
    expect(text.startsWith(CSV_BOM)).toBe(true);
    expect(text).toContain(
      "id,managementNo,name,model,serialNo,manufacturerId,location,status,note",
    );
    expect(text).toContain("M-001");
    expect(capture.name).toBe(`equipment_${todayIsoDate()}.csv`);
  });

  it("データ0件でもヘッダ行のみの CSV を出力する", async () => {
    renderWithStore(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: "機器" }));
    expect(capture.blob).toBeInstanceOf(Blob);
    if (!(capture.blob instanceof Blob)) throw new Error("blob が Blob ではありません");
    const buffer = await capture.blob.arrayBuffer();
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(buffer);
    expect(text).toContain("id,managementNo,name");
    expect(text).not.toContain("M-001");
  });
});

const equipmentCsvFile = (equipment: Equipment): File =>
  new File([buildEntityCsv("equipment", { [equipment.id]: equipment })], "equipment.csv", {
    type: "text/csv",
  });

describe("インポート(§11、D-029 / D-030)", () => {
  it("未選択時はプレビューに案内文を表示する", () => {
    renderWithStore(<Settings />);
    expect(
      screen.getByText("CSVファイルを選択すると、ここに検証結果が表示されます"),
    ).toBeInTheDocument();
  });

  it("正常CSVで取り込み可を表示し確定を活性化する", async () => {
    renderWithStore(<Settings />);
    await userEvent.upload(screen.getByLabelText("ファイル"), equipmentCsvFile(sampleEquipment));

    expect(await screen.findByText("✓ 1行 取り込み可")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "確定" })).toBeEnabled();
  });

  it("数式インジェクション様CSVで警告を表示しつつ確定は活性のまま(D-053)", async () => {
    renderWithStore(<Settings />);
    const suspiciousEquipment: Equipment = {
      ...sampleEquipment,
      note: '=HYPERLINK("https://evil.example")',
    };
    await userEvent.upload(
      screen.getByLabelText("ファイル"),
      equipmentCsvFile(suspiciousEquipment),
    );

    expect(await screen.findByText("⚠ 1行 警告")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "確定" })).toBeEnabled();
  });

  it("エラーCSVで行メッセージを表示し確定を非活性にする", async () => {
    renderWithStore(<Settings />);
    const badCsv = `${buildEntityCsv("equipment", {})}e1,M-001,ノギス,,,,,broken,\r\n`;
    const file = new File([badCsv], "equipment.csv", { type: "text/csv" });
    await userEvent.upload(screen.getByLabelText("ファイル"), file);

    expect(await screen.findByText("✗ 1行 エラー")).toBeInTheDocument();
    expect(screen.getByText(/行2:.*broken/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "確定" })).toBeDisabled();
  });

  it("確定 → 確認 → 取り込みで対象Recordを全置換する", async () => {
    seedStore({ equipment: { old: { ...sampleEquipment, id: "old", managementNo: "M-OLD" } } });
    renderWithStore(<Settings />);
    await userEvent.upload(screen.getByLabelText("ファイル"), equipmentCsvFile(sampleEquipment));
    await screen.findByText("✓ 1行 取り込み可");

    await userEvent.click(screen.getByRole("button", { name: "確定" }));
    await userEvent.click(screen.getByRole("button", { name: "取り込み" }));

    expect(useAppStore.getState().equipment).toEqual({ e1: sampleEquipment });
    expect(await screen.findByText("機器を 1 件取り込みました")).toBeInTheDocument();
  });

  it("キャンセルでプレビューをクリアする", async () => {
    renderWithStore(<Settings />);
    await userEvent.upload(screen.getByLabelText("ファイル"), equipmentCsvFile(sampleEquipment));
    await screen.findByText("✓ 1行 取り込み可");

    await userEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(
      screen.getByText("CSVファイルを選択すると、ここに検証結果が表示されます"),
    ).toBeInTheDocument();
  });

  it("対象エンティティ変更でプレビューをクリアする", async () => {
    renderWithStore(<Settings />);
    await userEvent.upload(screen.getByLabelText("ファイル"), equipmentCsvFile(sampleEquipment));
    await screen.findByText("✓ 1行 取り込み可");

    await userEvent.selectOptions(screen.getByLabelText("対象"), "vendors");
    expect(
      screen.getByText("CSVファイルを選択すると、ここに検証結果が表示されます"),
    ).toBeInTheDocument();
  });
});

describe("データ全削除(§11、D-031)", () => {
  it("同意チェックまで[削除]は非活性で、実行するとストアが空になる", async () => {
    seedStore({ equipment: { e1: sampleEquipment }, vendors: { v1: sampleVendor } });
    renderWithStore(<Settings />);

    await userEvent.click(screen.getByRole("button", { name: "データを全削除" }));
    expect(screen.getByRole("button", { name: "削除" })).toBeDisabled();

    await userEvent.click(screen.getByLabelText("全データを削除することを理解しました"));
    expect(screen.getByRole("button", { name: "削除" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(useAppStore.getState().equipment).toEqual({});
    expect(useAppStore.getState().vendors).toEqual({});
  });
});
