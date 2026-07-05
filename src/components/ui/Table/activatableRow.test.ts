import { activatableRowProps } from "@/components/ui/Table";
import type { KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";

const makeKeyboardEvent = (
  key: string,
): { event: KeyboardEvent<HTMLTableRowElement>; preventDefault: () => void } => {
  const preventDefault = vi.fn<() => void>();
  return {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- React合成イベントの完全な実体はテストで構築できないため、onKeyDownが参照するkey/preventDefaultのみ持つ最小オブジェクトで代替する
    event: { key, preventDefault } as unknown as KeyboardEvent<HTMLTableRowElement>,
    preventDefault,
  };
};

describe("activatableRowProps", () => {
  it("tabIndex=0 と cursor-pointer hover:bg-slate-50 の className を返す", () => {
    const props = activatableRowProps(vi.fn<() => void>());

    expect(props.tabIndex).toBe(0);
    expect(props.className).toBe("cursor-pointer hover:bg-slate-50");
  });

  it("onClick でアクティベート関数が呼ばれる", () => {
    const onActivate = vi.fn<() => void>();
    const props = activatableRowProps(onActivate);

    props.onClick();

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("Enter キーで preventDefault し、アクティベート関数が呼ばれる", () => {
    const onActivate = vi.fn<() => void>();
    const props = activatableRowProps(onActivate);
    const { event, preventDefault } = makeKeyboardEvent("Enter");

    props.onKeyDown(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("Space キーで preventDefault し、アクティベート関数が呼ばれる", () => {
    const onActivate = vi.fn<() => void>();
    const props = activatableRowProps(onActivate);
    const { event, preventDefault } = makeKeyboardEvent(" ");

    props.onKeyDown(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("Enter/Space 以外のキーは無視する", () => {
    const onActivate = vi.fn<() => void>();
    const props = activatableRowProps(onActivate);
    const { event, preventDefault } = makeKeyboardEvent("Tab");

    props.onKeyDown(event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onActivate).not.toHaveBeenCalled();
  });
});
