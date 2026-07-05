import type { ReactElement, ReactNode } from "react";

type Props = { title: string; children: ReactNode };

/** マニュアルの1セクション(枠 + 見出し)。index.tsx の反復スタイルを一元化する */
export const ManualSection = ({ title, children }: Props): ReactElement => (
  <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
    <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">{title}</h2>
    {children}
  </section>
);
