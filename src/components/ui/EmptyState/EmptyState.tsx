import type { ReactElement, ReactNode } from "react";

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
