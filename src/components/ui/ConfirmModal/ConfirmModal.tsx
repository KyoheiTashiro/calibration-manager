import { useDialog } from "@/components/ui/hooks/useDialog";
import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactElement,
  type SyntheticEvent,
} from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps): ReactElement => {
  const dialogRef = useDialog(open);
  const titleId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // なぜ: 破壊的操作の確認ダイアログは既定フォーカスを安全側（キャンセル）に置く。
  // showModal()の既定フォーカスも実ブラウザでは最初のフォーカス可能要素（＝キャンセル）に
  // 当たるが、DOM順への暗黙依存になるため明示的にフォーカスする。
  useEffect(() => {
    if (open) {
      cancelButtonRef.current?.focus();
    }
  }, [open]);

  // なぜ: dialogの標準Esc挙動（自動close）を止め、onCancelに一本化する。
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
    event.preventDefault();
    onCancel();
  };

  // なぜ: dialog自身がイベントターゲットになるのは内側コンテンツ外（余白＝オーバーレイ）が
  // クリックされたときのみのため、targetチェックだけで十分。
  const handleClick = (event: MouseEvent<HTMLDialogElement>): void => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- オーバーレイ（余白）クリックで閉じるためのonClick。キーボード経路はonCancel（Esc）が担う
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleClick}
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
          <button
            type="button"
            onClick={onConfirm}
            className="bg-danger h-9 rounded px-4 text-sm text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};
