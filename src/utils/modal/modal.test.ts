import { useEntityModal } from "@/utils/modal";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

type Widget = { id: string; name: string };

describe("useEntityModal", () => {
  it("初期状態は閉じており entity は未設定", () => {
    const { result } = renderHook(() => useEntityModal<Widget>());

    expect(result.current.modalState).toEqual({ open: false });
  });

  it("handleAddClick で entity 未指定のまま開く", () => {
    const { result } = renderHook(() => useEntityModal<Widget>());

    act(() => {
      result.current.handleAddClick();
    });

    expect(result.current.modalState).toEqual({ open: true, entity: undefined });
  });

  it("handleEditClick で指定した entity 付きで開く", () => {
    const { result } = renderHook(() => useEntityModal<Widget>());
    const widget: Widget = { id: "w-1", name: "ウィジェット" };

    act(() => {
      result.current.handleEditClick(widget);
    });

    expect(result.current.modalState).toEqual({ open: true, entity: widget });
  });

  it("handleModalClose で閉じて entity をリセットする", () => {
    const { result } = renderHook(() => useEntityModal<Widget>());
    const widget: Widget = { id: "w-1", name: "ウィジェット" };

    act(() => {
      result.current.handleEditClick(widget);
    });
    act(() => {
      result.current.handleModalClose();
    });

    expect(result.current.modalState).toEqual({ open: false, entity: undefined });
  });
});
