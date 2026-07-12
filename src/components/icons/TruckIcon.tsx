import { strokeIconProps, type IconProps } from "@/components/icons/base";
import type { ReactElement } from "react";

/** トラックアイコン(納期接近) */
export const TruckIcon = ({ className }: IconProps): ReactElement => (
  <svg {...strokeIconProps(className)}>
    <path d="M14 17V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2" />
    <path d="M15 17H9" />
    <path d="M19 17h2a1 1 0 0 0 1-1v-3.6a1 1 0 0 0-.22-.63l-3.48-4.35a1 1 0 0 0-.78-.37H14" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);
