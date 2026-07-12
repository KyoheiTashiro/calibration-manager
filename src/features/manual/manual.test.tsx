import { SERVICE_ITEM_STATUS } from "@/domain/serviceItemStatus";
import { statusBadgeLabel } from "@/domain/statusBadge";
import { Manual } from "@/features/manual";
import { NOTIFICATION_TYPE_LABELS } from "@/features/notifications/constants";
import { CSV_ENTITY_KINDS, entityCsvFileName } from "@/features/settings/components/csv/entityCsv";
import { NOTIFICATION_TYPE } from "@/store/types";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Manual", () => {
  beforeEach(setupStoreIsolation);

  it("見出し「利用マニュアル」(h1)が表示される", () => {
    renderWithStore(<Manual />);

    expect(screen.getByRole("heading", { level: 1, name: "利用マニュアル" })).toBeInTheDocument();
  });

  it("「目次」ボタンをクリックするとポップオーバーに「ページ上部へ戻る」と7つのセクションへのボタンが表示される", () => {
    renderWithStore(<Manual />);

    fireEvent.click(screen.getByRole("button", { name: "目次" }));

    for (const title of [
      "ページ上部へ戻る",
      "ご利用にあたって",
      "基本の流れ",
      "ステータスの見方",
      "期限と発注推奨日の計算",
      "各画面の説明",
      "CSVエクスポートとインポート",
      "ライセンスとソースコード",
    ]) {
      expect(screen.getByRole("button", { name: title })).toBeInTheDocument();
    }
  });

  it("目次のボタンをクリックすると対象セクションが scrollIntoView され、ポップオーバーが閉じる", () => {
    const scrollIntoView = vi.fn<() => void>();
    Element.prototype.scrollIntoView = scrollIntoView;

    renderWithStore(<Manual />);
    fireEvent.click(screen.getByRole("button", { name: "目次" }));
    fireEvent.click(screen.getByRole("button", { name: "ステータスの見方" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
    expect(screen.queryByRole("button", { name: "ステータスの見方" })).not.toBeInTheDocument();
  });

  it("目次を開いた状態でEscキーを押すとポップオーバーが閉じる", () => {
    renderWithStore(<Manual />);
    fireEvent.click(screen.getByRole("button", { name: "目次" }));
    expect(screen.getByRole("button", { name: "ステータスの見方" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("button", { name: "ステータスの見方" })).not.toBeInTheDocument();
  });

  it("目次の「ページ上部へ戻る」をクリックすると最上部見出しが scrollIntoView され、ポップオーバーが閉じる(D-067)", () => {
    const scrollIntoView = vi.fn<() => void>();
    Element.prototype.scrollIntoView = scrollIntoView;

    renderWithStore(<Manual />);
    fireEvent.click(screen.getByRole("button", { name: "目次" }));
    fireEvent.click(screen.getByRole("button", { name: "ページ上部へ戻る" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
    expect(screen.queryByRole("button", { name: "ページ上部へ戻る" })).not.toBeInTheDocument();
  });

  it.each([
    "ご利用にあたって",
    "基本の流れ",
    "ステータスの見方",
    "期限と発注推奨日の計算",
    "各画面の説明",
    "CSVエクスポートとインポート",
    "ライセンスとソースコード",
  ])("見出し「%s」(h2)が表示される", (heading) => {
    renderWithStore(<Manual />);

    expect(screen.getByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
  });

  it("全ステータスのバッジ日本語ラベルが表示される(SERVICE_ITEM_STATUS定義順=優先度順)", () => {
    renderWithStore(<Manual />);

    for (const status of Object.values(SERVICE_ITEM_STATUS)) {
      expect(screen.getAllByText(statusBadgeLabel(status)).length).toBeGreaterThan(0);
    }
  });

  it.each(["点検校正項目のステータス", "通知の種類"])(
    "ステータスの見方の小見出し「%s」(h3)が表示される(D-068)",
    (heading) => {
      renderWithStore(<Manual />);

      expect(screen.getByRole("heading", { level: 3, name: heading })).toBeInTheDocument();
    },
  );

  it("全通知種別のバッジ日本語ラベルと発生条件の説明が表示される(D-068)", () => {
    renderWithStore(<Manual />);

    for (const type of Object.values(NOTIFICATION_TYPE)) {
      expect(screen.getAllByText(NOTIFICATION_TYPE_LABELS[type]).length).toBeGreaterThan(0);
    }
    expect(
      screen.getByText(/返却予定日が近づいています\(7日前から\)/u, { exact: false }),
    ).toBeInTheDocument();
  });

  it.each([
    "CSVエクスポート",
    "CSVインポート",
    "インポート時にチェックされる内容",
    "複数の種類をインポートする順番",
    "セキュリティ上の注意",
  ])("CSVエクスポートとインポートの小見出し「%s」(h3)が表示される", (heading) => {
    renderWithStore(<Manual />);

    expect(screen.getByRole("heading", { level: 3, name: heading })).toBeInTheDocument();
  });

  it("エクスポートファイル名の一覧表に全7種のファイル名が推奨インポート順で表示される(D-065)", () => {
    renderWithStore(<Manual />);

    expect(screen.getByRole("columnheader", { name: "データの種類" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ファイル名" })).toBeInTheDocument();

    const fileNames = CSV_ENTITY_KINDS.map((kind) => entityCsvFileName(kind, "YYYY-MM-DD"));
    const cells = fileNames.map((name) => screen.getByText(name));
    for (const cell of cells) expect(cell).toBeInTheDocument();

    /* DOM上の出現順 = CSV_ENTITY_KINDS(推奨インポート順)であること */
    const ordered = [...cells].toSorted((left, right) =>
      // oxlint-disable-next-line no-bitwise -- compareDocumentPosition はビットマスクを返す仕様
      left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
    expect(ordered.map((cell) => cell.textContent)).toEqual(fileNames);
  });

  it("新しいデータの一括登録の説明(D-055)が表示される", () => {
    renderWithStore(<Manual />);

    expect(
      screen.getByText(/表計算ソフトで作成したCSVから新しいデータを一括登録/u, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/そのファイルに行を追記してから/u, { exact: false }),
    ).toBeInTheDocument();
  });

  it("インポートの全置換の説明と依存順のインポート順が表示される", () => {
    renderWithStore(<Manual />);

    expect(
      screen.getByText(/CSVの内容でまるごと置き換えられます/u, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "メーカー/取引先 → 担当者 → 機器 → 点検校正項目 → 点検校正外部案件 → 実施記録 → 通知",
        { exact: false },
      ),
    ).toBeInTheDocument();
  });

  it("主要画面へのリンクが存在する", () => {
    renderWithStore(<Manual />);

    expect(screen.getByRole("link", { name: "ダッシュボード" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "機器を追加" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "機器一覧" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "機器一覧・機器詳細" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "通知" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "通知センター" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "設定" })).toBeInTheDocument();

    expect(screen.getAllByRole("link", { name: "点検校正項目一覧" }).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getAllByRole("link", { name: "点検校正外部案件" }).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getAllByRole("link", { name: "メーカー/取引先" }).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getAllByRole("link", { name: "担当者" }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("link", { name: "設定画面" }).length).toBeGreaterThanOrEqual(2);
  });

  it("GitHubリポジトリへの外部リンクが新規タブで開く形で存在する", () => {
    renderWithStore(<Manual />);

    const link = screen.getByRole("link", { name: "GitHubリポジトリ" });
    expect(link).toHaveAttribute("href", "https://github.com/KyoheiTashiro/calibration-manager");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("ライセンス条件へのリンクがLICENSE.ja.mdファイルを新規タブで開く形で存在する", () => {
    renderWithStore(<Manual />);

    const link = screen.getByRole("link", { name: "ライセンスの条件" });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/KyoheiTashiro/calibration-manager/blob/main/LICENSE.ja.md",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});
