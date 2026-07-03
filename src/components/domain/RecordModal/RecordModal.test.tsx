/**
 * RecordModal: 実施記録登録モーダルの検証（screen-design/07-record-modal.md）。
 * 対象固定表示・doneBy プリフィル3分岐(D-017)・既定実施日・fail 注意書き・未来日警告(D-016)・
 * 登録カスケード・addRecord no-op 時のエラー維持・バリデーションを扱う。
 */

import { RecordModal } from "@/components/domain/RecordModal";
import {
  inspectionItemExternal,
  inspectionItemInternal,
  inspectionItemVendor,
  orderPlanned,
  orderReturned,
  orderVendor,
  seedRecordModalStore,
} from "@/components/domain/RecordModal/recordModalFixtures";
import { RECORD_RESULT } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, setupStoreIsolation } from "@/test/renderWithStore";
import { todayIsoDate } from "@/utils/time";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  setupStoreIsolation();
  seedRecordModalStore();
});

const recordsOf = (): ReturnType<typeof useAppStore.getState>["records"] =>
  useAppStore.getState().records;

describe("RecordModal", () => {
  it("対象が「対象:管理番号 機器名 / 項目名」で固定表示される", () => {
    renderWithStore(<RecordModal open inspectionItemId={inspectionItemExternal.id} onClose={vi.fn()} />);
    expect(screen.getByText("対象:EQ-001 ノギス / 年次校正")).toBeInTheDocument();
  });

  it("項目が解決できない場合でも例外を投げず defensive 表示になる", () => {
    renderWithStore(<RecordModal open inspectionItemId="missing" onClose={vi.fn()} />);
    expect(screen.getByText("対象:(項目情報が見つかりません)")).toBeInTheDocument();
  });

  it("実施日の既定値は今日", () => {
    renderWithStore(<RecordModal open inspectionItemId={inspectionItemExternal.id} onClose={vi.fn()} />);
    expect(screen.getByLabelText("実施日", { exact: false })).toHaveValue(todayIsoDate());
  });

  it("doneBy プリフィル: order 経由起動は案件の業者名", () => {
    renderWithStore(
      <RecordModal open inspectionItemId={inspectionItemExternal.id} orderId={orderReturned.id} onClose={vi.fn()} />,
    );
    expect(screen.getByLabelText("実施者", { exact: false })).toHaveValue(orderVendor.name);
  });

  it("doneBy プリフィル: external 項目(order なし)は項目の業者名", () => {
    renderWithStore(<RecordModal open inspectionItemId={inspectionItemExternal.id} onClose={vi.fn()} />);
    expect(screen.getByLabelText("実施者", { exact: false })).toHaveValue(inspectionItemVendor.name);
  });

  it("doneBy プリフィル: internal 項目は空欄", () => {
    renderWithStore(<RecordModal open inspectionItemId={inspectionItemInternal.id} onClose={vi.fn()} />);
    expect(screen.getByLabelText("実施者", { exact: false })).toHaveValue("");
  });

  it("order 経由起動時は案件連携の説明が表示される", () => {
    renderWithStore(
      <RecordModal open inspectionItemId={inspectionItemExternal.id} orderId={orderReturned.id} onClose={vi.fn()} />,
    );
    expect(screen.getByText(/案件連携/u)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(orderVendor.name, "u"))).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("fail 選択時に「次回期限は更新されません」の注意書きが表示される", async () => {
    const user = userEvent.setup();
    renderWithStore(<RecordModal open inspectionItemId={inspectionItemExternal.id} onClose={vi.fn()} />);

    expect(screen.queryByText("次回期限は更新されません")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("不合格"));
    expect(screen.getByText("次回期限は更新されません")).toBeInTheDocument();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("未来日を入力すると警告を表示するが登録はブロックしない", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithStore(<RecordModal open inspectionItemId={inspectionItemExternal.id} onClose={onClose} />);

    const doneDateField = screen.getByLabelText("実施日", { exact: false });
    await user.clear(doneDateField);
    await user.type(doneDateField, "2099-12-31");
    expect(screen.getByText("実施日が未来日です")).toBeInTheDocument();

    await user.click(screen.getByLabelText("合格"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(Object.values(recordsOf())).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("pass 登録でストアに記録が追加され onClose される", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithStore(<RecordModal open inspectionItemId={inspectionItemExternal.id} onClose={onClose} />);

    await user.click(screen.getByLabelText("合格"));
    await user.type(screen.getByLabelText("備考", { exact: false }), "証明書#A-102");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const records = Object.values(recordsOf());
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      inspectionItemId: inspectionItemExternal.id,
      doneDate: todayIsoDate(),
      doneBy: inspectionItemVendor.name,
      result: RECORD_RESULT.PASS,
      note: "証明書#A-102",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("addRecord が no-op(null)の場合はエラーを表示しモーダルを閉じない", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    // planned 案件は completed へ遷移不可のため addRecord は null を返す（decisions.md D-005）
    renderWithStore(
      <RecordModal open inspectionItemId={inspectionItemExternal.id} orderId={orderPlanned.id} onClose={onClose} />,
    );

    await user.click(screen.getByLabelText("合格"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      screen.getByText("登録できませんでした。データの状態を確認してください"),
    ).toBeInTheDocument();
    expect(Object.values(recordsOf())).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("実施者が空のまま登録するとエラーが表示されストアが変化しない", async () => {
    const user = userEvent.setup();
    renderWithStore(<RecordModal open inspectionItemId={inspectionItemInternal.id} onClose={vi.fn()} />);

    await user.click(screen.getByLabelText("合格"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("実施者は必須です")).toBeInTheDocument();
    expect(Object.values(recordsOf())).toHaveLength(0);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("結果未選択で登録するとエラーが表示されストアが変化しない", async () => {
    const user = userEvent.setup();
    renderWithStore(<RecordModal open inspectionItemId={inspectionItemExternal.id} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("結果を選択してください")).toBeInTheDocument();
    expect(Object.values(recordsOf())).toHaveLength(0);
  });
});
