import { useEffect, useRef, type RefObject } from "react";

/**
 * 要素の外側クリックを検知してハンドラを呼ぶ。
 * セレクトのドロップダウンやカレンダーのポップオーバー等、
 * アンカー式のフローティングUIを外クリックで閉じるために使う。
 * なぜ pointerdown か: click だと mousedown で外側→mouseup で内側に戻る操作でも
 * 発火してしまい、テキスト選択中の誤閉じが起きるため。
 */
export const useOutsideClick = (
  ref: RefObject<HTMLElement | null>,
  onOutsideClick: () => void,
  enabled: boolean,
): void => {
  // なぜ latest-ref パターンか: call site は全て inline arrow で onOutsideClick を渡しており、
  // 素直に依存配列へ入れると毎レンダーで listener が再登録されてしまう。
  // 最新の関数を ref に保持し、effect 依存からは外すことで登録を [ref, enabled] 変化時のみに絞る。
  const onOutsideClickRef = useRef(onOutsideClick);
  useEffect(() => {
    onOutsideClickRef.current = onOutsideClick;
  });

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent): void => {
      const { target } = event;
      if (target instanceof Node && ref.current?.contains(target) === true) return;
      onOutsideClickRef.current();
    };
    // enabled=false時も購読解除だけ返す(未登録へのremoveは無害)。早期returnはconsistent-return違反のため
    if (enabled) document.addEventListener("pointerdown", handlePointerDown);
    return (): void => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [ref, enabled]);
};
