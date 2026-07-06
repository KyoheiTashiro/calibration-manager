import type { KeyboardEvent } from "react";

type ActivatableRowProps = {
  tabIndex: 0;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => void;
  className: string;
};

export const activatableRowProps = (onActivate: () => void): ActivatableRowProps => ({
  tabIndex: 0,
  onClick: onActivate,
  onKeyDown: (event): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onActivate();
  },
  className: "cursor-pointer hover:bg-slate-50",
});
