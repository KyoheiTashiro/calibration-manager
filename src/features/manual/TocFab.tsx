import { ArrowUpIcon, CloseIcon, MenuIcon } from '@/components/icons';
import { useOutsideClick } from '@/components/ui/hooks/useOutsideClick';
import { useEffect, useRef, useState, type ReactElement } from 'react';

type TocSection = { id: string; title: string };

type Props = {
  sections: readonly TocSection[];
  /* ページ先頭へ戻る行(D-067)。セクション一覧の先頭に区切り付きで表示する */
  topSection: TocSection;
};

export const TocFab = ({ sections, topSection }: Props): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useOutsideClick(
    containerRef,
    () => {
      setIsOpen(false);
    },
    isOpen,
  );

  // なぜ Escape だけ別購読か: AppLayout のオーバーレイと同様、外側クリックに加えEscでも
  // 閉じる必要があるため。開いている間だけ購読し、閉じたら必ず解除する。
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSectionClick = (id: string): void => {
    document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth' });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className='relative'>
      {isOpen ? (
        <div className='absolute right-0 bottom-full mb-2 w-max rounded border border-slate-200 bg-white p-2 shadow-lg'>
          <ul className='flex flex-col gap-1'>
            <li className='border-b border-slate-200 pb-1'>
              <button
                type='button'
                className='text-primary flex w-full items-center gap-2 rounded px-3 py-1.5 text-left'
                onClick={() => {
                  handleSectionClick(topSection.id);
                }}
              >
                <ArrowUpIcon className='h-4 w-4' />
                {topSection.title}
              </button>
            </li>
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type='button'
                  className='text-primary block w-full rounded px-3 py-1.5 text-left'
                  onClick={() => {
                    handleSectionClick(section.id);
                  }}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type='button'
        aria-label='目次'
        aria-expanded={isOpen}
        className='border-primary text-primary rounded-full border bg-white p-3 shadow-md'
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
      >
        {isOpen ? <CloseIcon className='h-5 w-5' /> : <MenuIcon className='h-5 w-5' />}
      </button>
    </div>
  );
};
