import type { ReactElement, ReactNode } from "react";

// なぜ: 色はステータス色専用のStatusBadge（src/components/domain/StatusBadge）の責務であり、
// このBadgeは形状（ピル型）のみを提供する汎用コンポーネントとする。
type Props = {
  className?: string;
  children: ReactNode;
};

export const Badge = ({ className, children }: Props): ReactElement => {
  const baseClassName = "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium";
  const mergedClassName = [baseClassName, className].filter(Boolean).join(" ");

  return <span className={mergedClassName}>{children}</span>;
};
