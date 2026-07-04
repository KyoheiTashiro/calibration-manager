/**
 * 設定画面の危険な操作セクション(screen-design/11-settings.md §11、D-031)。
 * [データを全削除] → モーダル(警告 + 同意チェック)→ チェックで[削除する]活性化 → resetAll()。
 * ConfirmModal の追加多重確認はしない(チェック自体が §0.6 の2段階目、D-031)。
 */

import { Button, Checkbox, Modal } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { type ChangeEvent, type ReactElement, useState } from "react";

export const ResetSection = (): ReactElement => {
  const resetAll = useAppStore((store) => store.resetAll);
  const [open, setOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);

  // なぜ: モーダルを閉じたらチェック状態をリセットする(再オープン時の亡霊活性を防ぐ)。
  const handleClose = (): void => {
    setOpen(false);
    setUnderstood(false);
  };

  const handleDelete = (): void => {
    resetAll();
    handleClose();
  };

  const handleCheckChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setUnderstood(event.target.checked);
  };

  return (
    <section className="flex flex-col gap-3 rounded border border-red-300 p-4">
      <h2 className="border-b border-red-200 pb-2 text-lg font-semibold text-red-700">
        危険な操作
      </h2>
      <div>
        <Button variant="danger" onClick={() => setOpen(true)}>
          データを全削除
        </Button>
      </div>

      <Modal
        open={open}
        title="データを全削除"
        onClose={handleClose}
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>
              キャンセル
            </Button>
            <Button variant="danger" disabled={!understood} onClick={handleDelete}>
              削除
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-700">
            全てのデータ(機器・項目・実施記録・案件・メーカー・担当者・通知)を完全に削除します。この操作は取り消せません。
          </p>
          <Checkbox
            label="全データを削除することを理解しました"
            checked={understood}
            onChange={handleCheckChange}
          />
        </div>
      </Modal>
    </section>
  );
};
