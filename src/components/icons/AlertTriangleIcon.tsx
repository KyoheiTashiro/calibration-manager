import { strokeIconProps, type IconProps } from "@/components/icons/base";
import type { ReactElement } from "react";

/** 警告三角アイコン(期限超過) */
export const AlertTriangleIcon = ({ className }: IconProps): ReactElement => (
  <svg {...strokeIconProps(className)}>
    <path d="M10.3 4.1 2.6 17.4a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);
