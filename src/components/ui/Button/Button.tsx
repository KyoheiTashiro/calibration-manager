import type { ReactElement, ReactNode } from "react";

type Props = {
  variant?: "primary" | "secondary" | "danger";
  size?: "md" | "sm";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
};

// なぜ: ui-guidelines.md §10「主要ボタンh-9・二次/行内ボタンh-8」に対応するサイズ別クラス。
const SIZE_CLASS_NAME = {
  md: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-sm",
} as const;

// なぜ: ui-guidelines.md §3の色トークン（primary/primaryHover/danger）を使い、
// variantごとの配色をここに集約する。
const VARIANT_CLASS_NAME = {
  primary: "bg-primary text-white hover:bg-primaryHover",
  secondary: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  danger: "bg-danger text-white hover:bg-red-700",
} as const;

export const Button = ({
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  onClick,
  className,
  children,
}: Props): ReactElement => {
  const baseClassName =
    "inline-flex items-center justify-center rounded font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";
  const mergedClassName = [
    baseClassName,
    SIZE_CLASS_NAME[size],
    VARIANT_CLASS_NAME[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    // oxlint-disable-next-line react/button-has-type -- typeはPropsで"button"|"submit"に制約済み
    <button type={type} disabled={disabled} onClick={onClick} className={mergedClassName}>
      {children}
    </button>
  );
};
