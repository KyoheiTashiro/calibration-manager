import { strokeIconProps, type IconProps } from "@/components/icons/base";
import type { ReactElement } from "react";

/** 時計アイコン(期限接近) */
export const ClockIcon = ({ className }: IconProps): ReactElement => (
  <svg {...strokeIconProps(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);
