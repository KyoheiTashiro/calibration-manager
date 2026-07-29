import { strokeIconProps, type IconProps } from "@/components/icons/base";
import type { ReactElement } from "react";

/** カレンダーアイコン(日付入力のポップオーバー開閉トリガー) */
export const CalendarIcon = ({ className }: IconProps): ReactElement => (
  <svg {...strokeIconProps(className)}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);
