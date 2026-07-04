import { PersonModal } from "@/components/domain/PersonModal";
import {
  CYCLE,
  EXECUTION,
  INSPECTION_ITEM_TYPE,
  type InspectionItem,
  type Person,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: "person-1",
  name: "田中太郎",
  email: "tanaka@example.com",
  department: "品質保証部",
  isActive: true,
  ...overrides,
});

const buildInspectionItem = (overrides: Partial<InspectionItem> = {}): InspectionItem => ({
  id: "item-1",
  equipmentId: "equipment-1",
  type: INSPECTION_ITEM_TYPE.INSPECTION,
  name: "定期点検",
  cycle: CYCLE.M6,
  execution: EXECUTION.INTERNAL,
  bufferDays: 14,
  personId: "person-1",
  noticeDaysBefore: 30,
  nextDueDate: "2026-01-15",
  isActive: true,
  ...overrides,
});

describe("PersonModal", () => {
  beforeEach(setupStoreIsolation);

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("現役の点検校正項目に割り当てられた担当者を無効化しようとすると件数入りの警告が表示され、確定でisActiveがfalseになりモーダルが閉じる", async () => {
    const user = userEvent.setup();
    const person = buildPerson({ id: "person-1", isActive: true });
    seedStore({
      persons: { "person-1": person },
      inspectionItems: { "item-1": buildInspectionItem({ personId: "person-1", isActive: true }) },
    });
    const onClose = vi.fn<() => void>();

    renderWithStore(<PersonModal open person={person} onClose={onClose} />);

    await user.click(screen.getByLabelText("有効"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      screen.getByText(
        "この担当者は現役の点検校正項目 1 件に割り当てられています。通知が届かなくなる可能性があります。無効化しますか?",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "無効化" }));

    expect(useAppStore.getState().persons["person-1"]?.isActive).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("有効な点検校正項目の割り当てがない担当者を無効化しようとすると通常確認文が表示され、確定でisActiveがfalseになる", async () => {
    const user = userEvent.setup();
    const person = buildPerson({ id: "person-1", isActive: true });
    seedStore({
      persons: { "person-1": person },
      inspectionItems: {},
    });
    const onClose = vi.fn<() => void>();

    renderWithStore(<PersonModal open person={person} onClose={onClose} />);

    await user.click(screen.getByLabelText("有効"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText("この担当者を無効化しますか?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "無効化" }));

    expect(useAppStore.getState().persons["person-1"]?.isActive).toBe(false);
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("無効化確認をキャンセルすると保存されず、ストアのisActiveは変化しない", async () => {
    const user = userEvent.setup();
    const person = buildPerson({ id: "person-1", isActive: true });
    seedStore({
      persons: { "person-1": person },
      inspectionItems: {},
    });
    const onClose = vi.fn<() => void>();

    renderWithStore(<PersonModal open person={person} onClose={onClose} />);

    await user.click(screen.getByLabelText("有効"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByText("この担当者を無効化しますか?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(screen.queryByText("この担当者を無効化しますか?")).not.toBeInTheDocument();
    expect(useAppStore.getState().persons["person-1"]?.isActive).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  // oxlint-disable-next-line oxc/no-async-await -- user-eventの操作はPromiseを返すためawaitが必須
  it("氏名・メールのバリデーションエラーが表示され、エラー時も保存ボタンは無効化されない", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();

    renderWithStore(<PersonModal open onClose={onClose} />);

    const saveButton = screen.getByRole("button", { name: "保存" });
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    expect(await screen.findByText("氏名は必須です")).toBeInTheDocument();
    expect(screen.getByText("メールアドレスは必須です")).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();

    // なぜ exact: false か: 必須フィールドはTextFieldのrequired表示（"*"付きラベル）により
    // ラベルの実テキストが「氏名*」等になるため、完全一致だと取得できない。
    await user.type(screen.getByLabelText("氏名", { exact: false }), "山田花子");
    await user.type(screen.getByLabelText("メール", { exact: false }), "invalid");
    await user.click(saveButton);

    expect(await screen.findByText("メールアドレスの形式が不正です")).toBeInTheDocument();
    expect(screen.queryByText("氏名は必須です")).not.toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
