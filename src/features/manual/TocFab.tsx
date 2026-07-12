import { ArrowUpIcon, CloseIcon, MenuIcon } from "@/components/icons";
import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";

type TocSection = { id: string; title: string };

type TocFabProps = {
  sections: readonly TocSection[];
  /* ページ先頭へ戻る行(D-067)。セクション一覧の先頭に区切り付きで表示する */
  topSection: TocSection;
};

/* なぜ pointerdown + keydown か: AppLayout のオーバーレイと同じく、外側クリックとEscの
   両方で閉じる必要があるため。開いている間だけ購読し、閉じたら必ず解除する。 */
const useCloseOnOutsideInteraction = (
  isOpen: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
): void => {
  useEffect(() => {
    if (!isOpen) {
      return (): void => {
        // 非表示時はイベント購読していないため後始末は不要
      };
    }

    const handlePointerDown = (event: PointerEvent): void => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return (): void => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, containerRef, onClose]);
};

export const TocFab = ({ sections, topSection }: TocFabProps): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useCloseOnOutsideInteraction(isOpen, containerRef, () => {
    setIsOpen(false);
  });

  const handleSectionClick = (id: string): void => {
    document.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth" });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {isOpen ? (
        <div className="absolute right-0 bottom-full mb-2 w-max rounded border border-slate-200 bg-white p-2 shadow-lg">
          <ul className="flex flex-col gap-1">
            <li className="border-b border-slate-200 pb-1">
              <button
                type="button"
                className="text-primary flex w-full items-center gap-2 rounded px-3 py-1.5 text-left"
                onClick={() => {
                  handleSectionClick(topSection.id);
                }}
              >
                <ArrowUpIcon className="h-4 w-4" />
                {topSection.title}
              </button>
            </li>
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  className="text-primary block w-full rounded px-3 py-1.5 text-left"
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
        type="button"
        aria-label="目次"
        aria-expanded={isOpen}
        className="border-primary text-primary rounded-full border bg-white p-3 shadow-md"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
      >
        {isOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>
    </div>
  );
};
