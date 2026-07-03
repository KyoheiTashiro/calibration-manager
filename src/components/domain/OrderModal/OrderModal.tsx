/**
 * 外部校正案件（CalibrationOrder）の新規作成モーダル（screen-design/08-orders.md「案件作成モーダル」）。
 * RHF + zodResolver。起動元は項目一覧の「案件」アクション（外部・有効案件なしの項目）だが、
 * 起動元との接続は Phase 8 で行う（decisions.md D-020）。新規作成専用（status は常に addOrder が
 * planned 固定で付与するため渡さない)。1項目1有効案件制約（D-006）はストア層 addOrder が最終防衛線。
 */

import {
  defaultOrderFormValues,
  orderFormSchema,
  type OrderFormValues,
} from "@/components/domain/OrderModal/schema";
import { Button, DateField, Modal, Select, TextField } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useAppStore } from "@/store/useAppStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

type Props = {
  open: boolean;
  /** 対象項目。起動元で常に確定した状態で渡す（外部項目のみが起動対象） */
  itemId: string;
  onClose: () => void;
};

export const OrderModal = ({ open, itemId, onClose }: Props): ReactElement => {
  const item = useAppStore((state) => state.items[itemId]);
  const equipment = useAppStore((state) => (item ? state.equipment[item.equipmentId] : undefined));
  const vendors = useAppStore((state) => state.vendors);
  const addOrder = useAppStore((state) => state.addOrder);

  const [submitFailed, setSubmitFailed] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: defaultOrderFormValues,
  });

  const presetVendorId = item?.vendorId;
  const defaultVendorId =
    presetVendorId !== undefined && vendors[presetVendorId]?.isCalibrator ? presetVendorId : "";

  // なぜ: open/itemId変更のたびに既定値をプリフィルする（screen-design/README.md §0.5、ItemModal と同パターン）。
  // なぜ submitFailed をここでリセットしないか: react-compiler(EffectSetState)がeffect内での
  // 同期setStateを禁則とするため、RecordModal.tsxと同じ方針でイベントハンドラ側（onSubmit）に
  // 一本化し、再送信のたびに最新の結果へ更新する。
  useEffect(() => {
    reset({ ...defaultOrderFormValues, vendorId: defaultVendorId });
  }, [open, itemId, defaultVendorId, reset]);

  const calibratorVendors = Object.values(vendors).filter((vendor) => vendor.isCalibrator);
  const vendorOptions = calibratorVendors.map((vendor) => ({
    value: vendor.id,
    label: vendor.name,
  }));

  const targetLabel =
    item && equipment
      ? `対象:${equipment.managementNo} ${equipment.name} / ${item.name}`
      : "対象:(項目情報が見つかりません)";

  // なぜ: submitFailed を閉時にリセットし、同一対象で開き直した際の残留エラー表示を防ぐ
  // （RecordModal.tsx と同パターン。起動元のマウント方法に依存させない）。
  const handleClose = (): void => {
    setSubmitFailed(false);
    onClose();
  };

  const onSubmit = (values: OrderFormValues): void => {
    const orderId = addOrder({
      itemId,
      vendorId: values.vendorId,
      dueDate: values.dueDate || undefined,
      cost: values.cost ? Number(values.cost) : undefined,
      note: values.note || undefined,
    });
    setSubmitFailed(orderId === null);
    if (orderId === null) return;
    handleClose();
  };

  return (
    <Modal
      open={open}
      title="外部校正案件を作成"
      onClose={handleClose}
      isDirty={isDirty}
      footer={
        <Button type="button" onClick={handleSubmit(onSubmit)}>
          作成
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <span className="block text-sm text-slate-700">対象</span>
          <p className="text-sm text-slate-800">{targetLabel}</p>
        </div>
        {calibratorVendors.length === 0 ? (
          <div>
            <span className="block text-sm text-slate-700">
              依頼先<span className="text-red-600">*</span>
            </span>
            <p className="text-sm text-slate-600">
              校正業者が未登録です
              {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計（ItemModal.tsxと同様） */}
              <Link to={ROUTES.VENDOR_LIST} className="text-primary ml-1 underline">
                メーカー/取引先マスタへ
              </Link>
            </p>
          </div>
        ) : (
          <Select
            label="依頼先"
            required
            placeholder="選択してください"
            options={vendorOptions}
            error={errors.vendorId?.message}
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("vendorId")}
          />
        )}
        <DateField
          label="返却予定日"
          error={errors.dueDate?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("dueDate")}
        />
        <TextField
          label="費用"
          type="number"
          error={errors.cost?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("cost")}
        />
        <TextField
          label="備考"
          error={errors.note?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("note")}
        />
        {submitFailed ? (
          <p role="alert" className="text-xs text-red-600">
            この項目には進行中の案件が既に存在します
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
