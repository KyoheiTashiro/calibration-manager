import {
  AlertTriangleIcon,
  CartIcon,
  ClockIcon,
  TruckAlertIcon,
  TruckIcon,
} from "@/components/icons";
import type { IconProps } from "@/components/icons/base";
import { render } from "@testing-library/react";
import type { ComponentType, ReactElement } from "react";
import { describe, expect, it } from "vitest";

const icons: readonly { name: string; Icon: ComponentType<IconProps> }[] = [
  { name: "ClockIcon", Icon: ClockIcon },
  { name: "AlertTriangleIcon", Icon: AlertTriangleIcon },
  { name: "CartIcon", Icon: CartIcon },
  { name: "TruckIcon", Icon: TruckIcon },
  { name: "TruckAlertIcon", Icon: TruckAlertIcon },
];

describe.each(icons)("$name", ({ Icon }) => {
  it("aria-hidden なsvgを描画すること", () => {
    const { container } = render((<Icon />) as ReactElement);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("classNameがsvgへ伝播すること", () => {
    const { container } = render((<Icon className="h-3.5 w-3.5" />) as ReactElement);

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-3.5", "w-3.5");
  });
});
