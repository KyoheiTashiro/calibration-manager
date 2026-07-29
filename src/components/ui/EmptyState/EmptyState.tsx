import type { ReactElement, ReactNode } from "react";

type Props = {
  message: string;
  action?: ReactNode;
};

export const EmptyState = ({ message, action }: Props): ReactElement => {
  const hasAction = action !== undefined && action !== null;

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <p className="text-sm text-slate-500">{message}</p>
      {hasAction && <div>{action}</div>}
    </div>
  );
};
