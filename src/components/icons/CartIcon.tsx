import { strokeIconProps, type IconProps } from "@/components/icons/base";
import type { ReactElement } from "react";

/** カートアイコン(要発注) */
export const CartIcon = ({ className }: IconProps): ReactElement => (
  <svg {...strokeIconProps(className)}>
    <circle cx="9" cy="20" r="1" />
    <circle cx="18" cy="20" r="1" />
    <path d="M3 3h2l2.5 12.5a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.76L21 7H6" />
  </svg>
);
