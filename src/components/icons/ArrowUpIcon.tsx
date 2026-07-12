import { strokeIconProps, type IconProps } from "@/components/icons/base";
import type { ReactElement } from "react";

/** 上向き矢印アイコン */
export const ArrowUpIcon = ({ className }: IconProps): ReactElement => (
  <svg {...strokeIconProps(className)}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);
