import { usePagination } from "@/components/ui/Pagination/usePagination";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const buildItems = (count: number): number[] =>
  Array.from({ length: count }, (_unused, index) => index + 1);

describe("usePagination", () => {
  it("初期状態: page=1, pageSize=20 で先頭20件を返す", () => {
    const { result } = renderHook(() => usePagination(buildItems(45)));

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalCount).toBe(45);
    expect(result.current.pagedItems).toEqual(buildItems(20));
  });

  it("setPage(2) で21–40件目を返す", () => {
    const { result } = renderHook(() => usePagination(buildItems(45)));

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);
    expect(result.current.pagedItems).toEqual(
      Array.from({ length: 20 }, (_unused, index) => index + 21),
    );
  });

  it("setPageSize で1ページ目へ戻り、新しい件数で分割する", () => {
    const { result } = renderHook(() => usePagination(buildItems(45)));

    act(() => {
      result.current.setPage(2);
    });
    act(() => {
      result.current.setPageSize(10);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.pagedItems).toEqual(buildItems(10));
  });

  it("resetKey の変化で1ページ目へ戻る", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: string }) => usePagination(buildItems(45), resetKey),
      { initialProps: { resetKey: "a" } },
    );

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    rerender({ resetKey: "b" });

    expect(result.current.page).toBe(1);
    expect(result.current.pagedItems).toEqual(buildItems(20));
  });

  it("resetKey が同じままの再レンダーではページを維持する", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }: { resetKey: string }) => usePagination(buildItems(45), resetKey),
      { initialProps: { resetKey: "a" } },
    );

    act(() => {
      result.current.setPage(2);
    });
    rerender({ resetKey: "a" });

    expect(result.current.page).toBe(2);
  });

  it("データ減少で現在ページが範囲外になった場合は最終ページへ丸める", () => {
    const { result, rerender } = renderHook(
      ({ count }: { count: number }) => usePagination(buildItems(count)),
      { initialProps: { count: 100 } },
    );

    act(() => {
      result.current.setPage(5);
    });
    expect(result.current.page).toBe(5);

    rerender({ count: 25 });

    expect(result.current.page).toBe(2);
    expect(result.current.pagedItems).toEqual([21, 22, 23, 24, 25]);
  });

  it("0件のとき page=1, pagedItems=[] を返す", () => {
    const { result } = renderHook(() => usePagination(buildItems(0)));

    expect(result.current.page).toBe(1);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.pagedItems).toEqual([]);
  });
});
