import { strokeIconProps, type IconProps } from "@/components/icons/base";
import type { ReactElement } from "react";

/** チェックマークアイコン(正常) */
export const CheckIcon = ({ className }: IconProps): ReactElement => (
  <svg {...strokeIconProps(className)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
