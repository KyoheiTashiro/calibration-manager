import { activatableRowProps } from "@/components/ui/Table";
import type { KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";

const makeKeyboardEvent = (key: string): KeyboardEvent<HTMLTableRowElement> =>
  ({
    key,
    preventDefault: vi.fn(),
  }) as unknown as KeyboardEvent<HTMLTableRowElement>;

describe("activatableRowProps", () => {
  it("tabIndex=0 と cursor-pointer hover:bg-slate-50 の className を返す", () => {
    const props = activatableRowProps(vi.fn());

    expect(props.tabIndex).toBe(0);
    expect(props.className).toBe("cursor-pointer hover:bg-slate-50");
  });

  it("onClick でアクティベート関数が呼ばれる", () => {
    const onActivate = vi.fn();
    const props = activatableRowProps(onActivate);

    props.onClick();

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("Enter キーで preventDefault し、アクティベート関数が呼ばれる", () => {
    const onActivate = vi.fn();
    const props = activatableRowProps(onActivate);
    const event = makeKeyboardEvent("Enter");

    props.onKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("Space キーで preventDefault し、アクティベート関数が呼ばれる", () => {
    const onActivate = vi.fn();
    const props = activatableRowProps(onActivate);
    const event = makeKeyboardEvent(" ");

    props.onKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("Enter/Space 以外のキーは無視する", () => {
    const onActivate = vi.fn();
    const props = activatableRowProps(onActivate);
    const event = makeKeyboardEvent("Tab");

    props.onKeyDown(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onActivate).not.toHaveBeenCalled();
  });
});
