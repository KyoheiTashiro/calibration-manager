import { fillIconProps, type IconProps } from "@/components/icons/base";
import type { ReactElement } from "react";

/** 通知ベルアイコン */
export const BellIcon = ({ className }: IconProps): ReactElement => (
  <svg {...fillIconProps(className)}>
    <path d="M12 2a1 1 0 0 1 1 1v.1a6 6 0 0 1 5 5.9v3.5l1.6 3.2a1 1 0 0 1-.9 1.3H4.3a1 1 0 0 1-.9-1.3L5 12.5V9a6 6 0 0 1 5-5.9V3a1 1 0 0 1 1-1z" />
    <path d="M9.55 20a2.5 2.5 0 0 0 4.9 0z" />
  </svg>
);
