import { PersonList } from "@/features/persons";
import type { Person } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { renderWithStore, seedStore, setupStoreIsolation } from "@/test/renderWithStore";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it } from "vitest";

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: "person-1",
  name: "田中太郎",
  email: "tanaka@example.com",
  department: "品質保証部",
  isActive: true,
  ...overrides,
});

describe("PersonList", () => {
  beforeEach(setupStoreIsolation);

  it("複数の担当者（有効/無効・部署ありなし混在）が氏名・部署・メール・状態バッジ付きで一覧表示される", () => {
    seedStore({
      persons: {
        "person-1": buildPerson({
          id: "person-1",
          name: "田中太郎",
          department: "品質保証部",
          email: "tanaka@example.com",
          isActive: true,
        }),
        "person-2": buildPerson({
          id: "person-2",
          name: "佐藤花子",
          department: undefined,
          email: "sato@example.com",
          isActive: false,
        }),
      },
    });

    renderWithStore(<PersonList />);

    const tanakaRow = screen.getByText("田中太郎").closest("tr");
    if (!tanakaRow) throw new Error("田中太郎の行が見つかりません");
    expect(within(tanakaRow).getByText("品質保証部")).toBeInTheDocument();
    expect(within(tanakaRow).getByText("tanaka@example.com")).toBeInTheDocument();
    expect(within(tanakaRow).getByText("有効")).toBeInTheDocument();

    const satoRow = screen.getByText("佐藤花子").closest("tr");
    if (!satoRow) throw new Error("佐藤花子の行が見つかりません");
    expect(within(satoRow).getByText("—")).toBeInTheDocument();
    expect(within(satoRow).getByText("sato@example.com")).toBeInTheDocument();
    expect(within(satoRow).getByText("無効")).toBeInTheDocument();
  });

  it("担当者が0件のとき空状態メッセージと「+ 追加」ボタンが表示される", () => {
    renderWithStore(<PersonList />);

    expect(screen.getByText("担当者が未登録です")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "+ 追加" }).length).toBeGreaterThan(0);
  });

  it("「+ 追加」からモーダルで入力して保存すると、ストアのpersonsに反映され一覧にも表示される", async () => {
    const user = userEvent.setup();
    renderWithStore(<PersonList />);

    // なぜ getAllByRole の先頭要素か: 0件時はヘッダーの「+ 追加」とEmptyStateのCTAが
    // 同名で2つ描画されるため、先頭（ヘッダー側）を使う。
    await user.click(screen.getAllByRole("button", { name: "+ 追加" })[0]);

    await user.type(screen.getByLabelText("氏名", { exact: false }), "鈴木一郎");
    await user.type(screen.getByLabelText("メール", { exact: false }), "suzuki@example.com");
    await user.type(screen.getByLabelText("部署"), "製造部");

    await user.click(screen.getByRole("button", { name: "保存" }));

    const persons = Object.values(useAppStore.getState().persons);
    expect(persons).toHaveLength(1);
    expect(persons[0]).toMatchObject({
      name: "鈴木一郎",
      email: "suzuki@example.com",
      department: "製造部",
      isActive: true,
    });

    expect(await screen.findByText("鈴木一郎")).toBeInTheDocument();
  });

  it("既存担当者の「編集」からモーダルにプリフィルされ、変更して保存するとストア・一覧に反映される", async () => {
    const user = userEvent.setup();
    seedStore({
      persons: {
        "person-1": buildPerson({
          id: "person-1",
          name: "田中太郎",
          department: "品質保証部",
          email: "tanaka@example.com",
          isActive: true,
        }),
      },
    });

    renderWithStore(<PersonList />);

    await user.click(screen.getByRole("button", { name: "編集" }));

    // なぜ exact: false か: 必須フィールドはTextFieldのrequired表示（"*"付きラベル）により
    // ラベルの実テキストが「氏名*」等になるため、完全一致だと取得できない。
    const nameField = screen.getByLabelText("氏名", { exact: false });
    expect(nameField).toHaveValue("田中太郎");
    expect(screen.getByLabelText("メール", { exact: false })).toHaveValue("tanaka@example.com");
    expect(screen.getByLabelText("部署")).toHaveValue("品質保証部");

    await user.clear(nameField);
    await user.type(nameField, "田中次郎");

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(useAppStore.getState().persons["person-1"]).toMatchObject({
      name: "田中次郎",
      email: "tanaka@example.com",
      department: "品質保証部",
    });
    expect(await screen.findByText("田中次郎")).toBeInTheDocument();
  });
});
