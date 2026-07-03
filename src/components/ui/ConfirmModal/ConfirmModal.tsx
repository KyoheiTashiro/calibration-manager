import { useDialog } from "@/components/ui/hooks/useDialog";
import { useEffect, useId, useRef, type ReactElement } from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel,
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps): ReactElement => {
  const dialogRef = useDialog(open);
  const titleId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // なぜ: 破壊的操作の確認ダイアログは既定フォーカスを安全側（キャンセル）に置く。
  useEffect(() => {
    if (open) {
      cancelButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    // なぜ: dialogの標準Esc挙動（自動close）を止め、onCancelに一本化する。
    const handleCancel = (event: Event): void => {
      event.preventDefault();
      onCancel();
    };

    // なぜ: dialog自身がイベントターゲットになるのは内側コンテンツ外（余白＝オーバーレイ）が
    // クリックされたときのみのため、targetチェックだけで十分。
    const handleClick = (event: MouseEvent): void => {
      if (event.target === dialogElement) {
        onCancel();
      }
    };

    dialogElement.addEventListener("cancel", handleCancel);
    dialogElement.addEventListener("click", handleClick);

    return (): void => {
      dialogElement.removeEventListener("cancel", handleCancel);
      dialogElement.removeEventListener("click", handleClick);
    };
  }, [dialogRef, onCancel]);

  const confirmButtonClassName = danger
    ? "h-9 rounded bg-danger px-4 text-sm text-white"
    : "h-9 rounded bg-primary px-4 text-sm text-white";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="border-line m-auto w-full max-w-sm rounded-lg border p-0 backdrop:bg-slate-900/50"
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <p className="text-sm text-slate-700">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="h-9 rounded border border-slate-300 px-4 text-sm text-slate-700"
          >
            キャンセル
          </button>
          <button type="button" onClick={onConfirm} className={confirmButtonClassName}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};
