import { Pagination } from "@/components/ui/Pagination";
import { buildPageItems, ELLIPSIS } from "@/components/ui/Pagination/pageItems";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する。
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("Pagination", () => {
  it("ルート要素に role=navigation と aria-label=ページネーション が付与される", () => {
    render(
      <Pagination
        page={1}
        pageSize={20}
        totalCount={123}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByRole("navigation", { name: "ページネーション" })).toBeInTheDocument();
  });

  it("総件数表示: 全123件中 21–40件目（page=2, pageSize=20, totalCount=123）", () => {
    render(
      <Pagination
        page={2}
        pageSize={20}
        totalCount={123}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText("全123件中 21–40件目")).toBeInTheDocument();
  });

  it("totalCount=0 のとき「全0件」のみ表示され、ページ番号・前後ボタンは非表示になる", () => {
    render(
      <Pagination
        page={1}
        pageSize={20}
        totalCount={0}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText("全0件")).toBeInTheDocument();
    expect(screen.queryByText(/件目/u)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("1ページに収まる場合もページ番号・前後ボタンを表示し、前へ/次へは両方無効化される(D-079)", () => {
    render(
      <Pagination
        page={1}
        pageSize={20}
        totalCount={5}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText("全5件中 1–5件目")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "1ページの表示件数" })).toBeInTheDocument();
  });

  it("省略記号: totalPages=20, page=10 のとき 1 … 8 9 10 11 12 … 20 が表示される", () => {
    render(
      <Pagination
        page={10}
        pageSize={10}
        totalCount={200}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    const pageButtons = screen.getAllByRole("button", { name: /^\d+$/u });
    expect(pageButtons.map((button) => button.textContent)).toEqual([
      "1",
      "8",
      "9",
      "10",
      "11",
      "12",
      "20",
    ]);
    expect(screen.getAllByText("…")).toHaveLength(2);
  });

  it("現在ページのボタンに aria-current=page が付き、他ページには付かない", () => {
    render(
      <Pagination
        page={5}
        pageSize={10}
        totalCount={100}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "6" })).not.toHaveAttribute("aria-current");
  });

  it("先頭ページで「前へ」が disabled になる", () => {
    render(
      <Pagination
        page={1}
        pageSize={10}
        totalCount={100}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
  });

  it("末尾ページで「次へ」が disabled になる", () => {
    render(
      <Pagination
        page={10}
        pageSize={10}
        totalCount={100}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "前へ" })).toBeEnabled();
  });

  it("中間ページでは「前へ」「次へ」とも enabled になる", () => {
    render(
      <Pagination
        page={5}
        pageSize={10}
        totalCount={100}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByRole("button", { name: "前へ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
  });

  it("ページ番号をクリックすると onPageChange がその番号で呼ばれる", () => {
    const handlePageChange = vi.fn<() => void>();
    render(
      <Pagination
        page={5}
        pageSize={10}
        totalCount={100}
        onPageChange={handlePageChange}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "6" }));

    expect(handlePageChange).toHaveBeenCalledTimes(1);
    expect(handlePageChange).toHaveBeenCalledWith(6);
  });

  it("現在ページのボタンをクリックしても onPageChange は呼ばれない", () => {
    const handlePageChange = vi.fn<() => void>();
    render(
      <Pagination
        page={5}
        pageSize={10}
        totalCount={100}
        onPageChange={handlePageChange}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "5" }));

    expect(handlePageChange).not.toHaveBeenCalled();
  });

  it("「次へ」クリックで onPageChange(page+1)、「前へ」クリックで onPageChange(page-1) が呼ばれる", () => {
    const handlePageChange = vi.fn<() => void>();
    render(
      <Pagination
        page={5}
        pageSize={10}
        totalCount={100}
        onPageChange={handlePageChange}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(handlePageChange).toHaveBeenCalledWith(6);

    fireEvent.click(screen.getByRole("button", { name: "前へ" }));
    expect(handlePageChange).toHaveBeenCalledWith(4);
  });

  it("表示件数セレクタを変更すると onPageSizeChange が数値で呼ばれる", async () => {
    const user = userEvent.setup();
    const handlePageSizeChange = vi.fn<() => void>();
    render(
      <Pagination
        page={1}
        pageSize={20}
        totalCount={123}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={handlePageSizeChange}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "1ページの表示件数" }));
    await user.click(screen.getByRole("option", { name: "50件" }));

    expect(handlePageSizeChange).toHaveBeenCalledTimes(1);
    expect(handlePageSizeChange).toHaveBeenCalledWith(50);
  });

  it("page が範囲外（page=99, totalPages=7）のとき表示上は最終ページ扱いになる", () => {
    render(
      <Pagination
        page={99}
        pageSize={10}
        totalCount={70}
        onPageChange={vi.fn<() => void>()}
        onPageSizeChange={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByRole("button", { name: "7" })).toHaveAttribute("aria-current", "page");
  });
});

describe("buildPageItems", () => {
  it("先頭ページ（page=1）では省略記号の枠まで数字で埋め、末尾との間のみ省略記号になる", () => {
    expect(buildPageItems(1, 20)).toEqual([1, 2, 3, 4, 5, 6, 7, ELLIPSIS, 20]);
  });

  it("末尾ページでは先頭との間のみ省略記号になり、右側は数字で埋まる", () => {
    expect(buildPageItems(20, 20)).toEqual([1, ELLIPSIS, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("中央ページでは両側に省略記号が入る", () => {
    expect(buildPageItems(10, 20)).toEqual([1, ELLIPSIS, 8, 9, 10, 11, 12, ELLIPSIS, 20]);
  });

  it("省略記号が1ページしか隠さない位置ではページ番号をそのまま表示する", () => {
    // 旧仕様では 1 … 3 4 5 6 7 … 10（「…」が隠すのはページ2のみ）だった
    expect(buildPageItems(5, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, ELLIPSIS, 10]);
  });

  it("totalPages が固定スロット数(9)以下なら省略記号を含まない連番になる", () => {
    expect(buildPageItems(2, 3)).toEqual([1, 2, 3]);
    expect(buildPageItems(5, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("totalPages=1 のとき [1] のみを返す", () => {
    expect(buildPageItems(1, 1)).toEqual([1]);
  });

  it("totalPages が固定スロット数を超える場合、どの現在ページでも常に9アイテムを返す（レイアウトシフト防止）", () => {
    const totalPages = 20;
    for (let page = 1; page <= totalPages; page += 1) {
      expect(buildPageItems(page, totalPages)).toHaveLength(9);
    }
  });
});
