import { strokeIconProps, type IconProps } from "@/components/icons/base";
import type { ReactElement } from "react";

/** ×（閉じる）アイコン */
export const CloseIcon = ({ className }: IconProps): ReactElement => (
  // oxlint-disable-next-line react/jsx-props-no-spreading -- strokeIconProps()のSVG共通属性を素通しするため必須
  <svg {...strokeIconProps(className)}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);
