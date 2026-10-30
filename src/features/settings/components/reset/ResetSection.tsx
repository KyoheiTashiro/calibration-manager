import { Button, Checkbox, Modal } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { type ChangeEvent, type ReactElement, useState } from 'react';

export const ResetSection = (): ReactElement => {
  const resetAll = useAppStore((store) => store.resetAll);
  // なぜ開閉フラグと分けないか: チェック状態はモーダルが開いている間だけ意味を持つ。
  // null = 閉 にまとめると、閉じるだけでチェックも消え、再オープン時の亡霊活性が構造上起きない。
  const [modal, setModal] = useState<{ understood: boolean } | null>(null);

  const handleClose = (): void => {
    setModal(null);
  };

  const handleDelete = (): void => {
    resetAll();
    handleClose();
  };

  const handleCheckChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setModal({ understood: event.target.checked });
  };

  return (
    <section className='flex flex-col gap-3 rounded border border-red-300 p-4'>
      <h2 className='border-b border-red-200 pb-2 text-lg font-semibold text-red-700'>
        危険な操作
      </h2>
      <div>
        <Button
          variant='danger'
          onClick={() => {
            setModal({ understood: false });
          }}
        >
          データを全削除
        </Button>
      </div>

      <Modal
        open={modal !== null}
        title='データを全削除'
        onClose={handleClose}
        footer={
          <>
            <Button variant='secondary' onClick={handleClose}>
              キャンセル
            </Button>
            <Button variant='danger' disabled={modal?.understood !== true} onClick={handleDelete}>
              削除
            </Button>
          </>
        }
      >
        <div className='flex flex-col gap-4'>
          <p className='text-sm text-slate-700'>
            全てのデータ(機器・項目・実施記録・案件・メーカー・担当者・通知)を完全に削除します。この操作は取り消せません。
          </p>
          <Checkbox
            label='全データを削除することを理解しました'
            checked={modal?.understood ?? false}
            onChange={handleCheckChange}
          />
        </div>
      </Modal>
    </section>
  );
};
