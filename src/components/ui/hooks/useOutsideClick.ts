import { useEffect, type RefObject } from "react";

// なぜ: ドロップダウン・ポップオーバー等が外側クリックで閉じる挙動を共通化するための汎用フック
// （src/components/ui/hooks に集約する directory-structure.md の構成に対応）。
export const useOutsideClick = (
  ref: RefObject<HTMLElement | null>,
  onOutsideClick: () => void,
): void => {
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);

    return (): void => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [ref, onOutsideClick]);
};
