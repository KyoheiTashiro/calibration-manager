import type { ReactElement, ReactNode } from "react";

// なぜ: ui-guidelines.md §6「空状態」・screen-design README §0.7準拠で
// アイコン + 説明文 + 主要CTA を中央寄せで統一表示する汎用コンポーネント。
type Props = {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
};

export const EmptyState = ({ icon, message, action }: Props): ReactElement => {
  const hasIcon = icon !== undefined && icon !== null;
  const hasAction = action !== undefined && action !== null;

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      {hasIcon && (
        <div aria-hidden="true" className="text-slate-300 [&>svg]:h-8 [&>svg]:w-8">
          {icon}
        </div>
      )}
      <p className="text-sm text-slate-500">{message}</p>
      {hasAction && <div>{action}</div>}
    </div>
  );
};
