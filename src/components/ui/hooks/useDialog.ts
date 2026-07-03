import { useEffect, useRef, type RefObject } from "react";

// なぜ: Modal/ConfirmModal共通でdialog要素のshowModal/close呼び出しを1箇所に集約する
// （src/components/ui/hooksに集約するdirectory-structure.mdの構成に対応）。
// dialog.openの現在値を見てから呼ぶことで、既に開/閉状態のときに再度呼んで
// InvalidStateErrorになることを避ける。
export const useDialog = (open: boolean): RefObject<HTMLDialogElement | null> => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;
    if (open && !dialogElement.open) {
      dialogElement.showModal();
    }
    if (!open && dialogElement.open) {
      dialogElement.close();
    }
  }, [open]);

  // なぜ: アンマウント時に開いたままだと（トップレイヤーに残る等の）不整合が起きうるため、
  // マウント中のみ有効なcleanupで開いていれば閉じる。cleanup実行時点ではrefが指す先が
  // 変わっている可能性があるため、effect実行時点のノードを変数に退避してcleanupで参照する。
  useEffect(() => {
    const dialogElement = dialogRef.current;

    return (): void => {
      if (dialogElement?.open) {
        dialogElement.close();
      }
    };
  }, []);

  return dialogRef;
};
