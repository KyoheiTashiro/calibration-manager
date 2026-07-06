import type { ReactElement } from "react";

type Props = {
  tabs: readonly { key: string; label: string }[];
  activeKey: string;
  onChange: (key: string) => void;
};

export const Tabs = ({ tabs, activeKey, onChange }: Props): ReactElement => (
  <div role="tablist" className="flex gap-4 border-b border-slate-200">
    {tabs.map((tab) => {
      const isActive = tab.key === activeKey;
      const tabClassName = isActive
        ? "border-b-2 border-primary text-primary"
        : "border-b-2 border-transparent text-slate-500 hover:text-slate-700";

      return (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => {
            onChange(tab.key);
          }}
          className={`px-1 py-2 text-sm font-medium transition-colors duration-150 ${tabClassName}`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);
