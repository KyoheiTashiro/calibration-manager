import { useDialog } from "@/components/ui/hooks/useDialog";
import { useCallback, useEffect, useId, useState, type ReactElement, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  isDirty?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
};

// なぜ: サイズ別の最大幅クラスをここに集約する（Button.tsxのSIZE_CLASS_NAMEイディオムに合わせる）。
const SIZE_CLASS_NAME = {
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

export const Modal = ({
  open,
  title,
  onClose,
  isDirty = false,
  children,
  footer,
  size = "md",
}: ModalProps): ReactElement => {
  const dialogRef = useDialog(open);
  const titleId = useId();
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  // なぜ: isDirty時は即座に閉じずに破棄確認オーバーレイを出す。×ボタン・Esc相当・
  // オーバーレイクリックの3経路すべてがこの関数を経由することで挙動を一本化する。
  // useCallbackで安定化し、下のuseEffectが依存配列越しに毎レンダー再購読するのを避ける。
  const attemptClose = useCallback((): void => {
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    // なぜ: dialogの標準Esc挙動（自動close）を止め、破棄確認を挟めるよう自前制御にする。
    const handleCancel = (event: Event): void => {
      event.preventDefault();
      attemptClose();
    };

    // なぜ: dialog自身がイベントターゲットになるのは内側コンテンツ外（余白＝オーバーレイ）が
    // クリックされたときのみのため、targetチェックだけで十分（内側でのstopPropagation不要）。
    const handleClick = (event: MouseEvent): void => {
      if (event.target === dialogElement) {
        attemptClose();
      }
    };

    // なぜ: 破棄確認を出したまま親が open=false で強制クローズした場合に確認オーバーレイの
    // stateが残留し、次回オープン時に亡霊表示されるのを防ぐ。dialogのcloseイベント
    // （どの経路で閉じても発火する外部システムイベント）を購読してリセットする。
    const handleDialogClose = (): void => {
      setConfirmDiscardOpen(false);
    };

    dialogElement.addEventListener("cancel", handleCancel);
    dialogElement.addEventListener("click", handleClick);
    dialogElement.addEventListener("close", handleDialogClose);

    return (): void => {
      dialogElement.removeEventListener("cancel", handleCancel);
      dialogElement.removeEventListener("click", handleClick);
      dialogElement.removeEventListener("close", handleDialogClose);
    };
  }, [dialogRef, attemptClose]);

  const handleCancelDiscard = (): void => {
    setConfirmDiscardOpen(false);
  };

  const handleConfirmDiscard = (): void => {
    setConfirmDiscardOpen(false);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`m-auto w-full ${SIZE_CLASS_NAME[size]} border-line rounded-lg border p-0 backdrop:bg-slate-900/50`}
    >
      <div className="relative flex max-h-[85vh] flex-col">
        <div className="border-line flex items-center justify-between border-b px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={attemptClose}
            className="text-slate-500 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer ? (
          <div className="border-line flex justify-end gap-2 border-t px-4 py-3">{footer}</div>
        ) : null}

        {confirmDiscardOpen ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/95 px-4 text-center">
            <p className="text-sm font-medium">編集内容を破棄しますか?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelDiscard}
                className="h-9 rounded border border-slate-300 px-4 text-sm text-slate-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="bg-danger h-9 rounded px-4 text-sm text-white"
              >
                破棄
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </dialog>
  );
};
