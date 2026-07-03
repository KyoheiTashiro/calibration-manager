import { strokeIconProps, type IconProps } from "@/components/icons/base";
import type { ReactElement } from "react";

/** ハンバーガーメニュー（3本線）アイコン */
export const MenuIcon = ({ className }: IconProps): ReactElement => (
  // oxlint-disable-next-line react/jsx-props-no-spreading -- strokeIconProps()のSVG共通属性を素通しするため必須
  <svg {...strokeIconProps(className)}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);
