import { useRef, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';

type Props = {
  tabs: readonly { key: string; label: string }[];
  activeKey: string;
  onChange: (key: string) => void;
  // タブバー右端に置く操作要素(例: 通知一覧の「全て既読」)。
  // role=tablist の外に置き、tab 以外の子を tablist に含めない(ARIA仕様)
  actions?: ReactNode;
};

export const Tabs = ({ tabs, activeKey, onChange, actions }: Props): ReactElement => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // ARIA tabs パターン(automatic activation): ←→ で隣のタブへフォーカス移動と同時に選択。
  // 端では反対側へループする
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const offset = event.key === 'ArrowLeft' ? -1 : 1;
    const nextIndex = (index + offset + tabs.length) % tabs.length;
    onChange(tabs[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  };

  // 下線(border-b)は外側ラッパーが持つ。アクティブタブの -mb-px はラッパーの
  // 下線に重なるため、従来どおり border-b-white で打ち消せる
  return (
    <div className='flex items-end justify-between gap-4 border-b border-slate-200'>
      <div role='tablist' className='flex gap-1'>
        {tabs.map((tab, index) => {
          const isActive = tab.key === activeKey;
          // アクティブタブは -mb-px でラッパーの下線に 1px 重ね、border-b-white で
          // 下線を打ち消してコンテンツ面と連結したカードに見せる
          const tabClassName = isActive
            ? '-mb-px border-slate-200 border-b-white bg-white text-primary'
            : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700';

          return (
            <button
              key={tab.key}
              ref={(element): void => {
                tabRefs.current[index] = element;
              }}
              type='button'
              role='tab'
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                onChange(tab.key);
              }}
              onKeyDown={(event) => {
                handleKeyDown(event, index);
              }}
              className={`rounded-t-lg border px-3 py-2 text-sm font-medium transition-colors duration-150 ${tabClassName}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {actions !== undefined && <div className='pb-1'>{actions}</div>}
    </div>
  );
};
