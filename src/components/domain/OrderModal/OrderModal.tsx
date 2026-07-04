/**
 * 校正案件（CalibrationOrder）の新規作成モーダル（screen-design/08-orders.md「案件作成モーダル」）。
 * RHF + zodResolver。起動元は項目一覧の「案件」アクション（外部・有効案件なしの項目）だが、
 * 起動元との接続は Phase 8 で行う（decisions.md D-020）。新規作成専用（status は常に addOrder が
 * planned 固定で付与するため渡さない)。1項目1有効案件制約（D-006）はストア層 addOrder が最終防衛線。
 * 呼び出し元は閉時アンマウント（条件マウント）必須。defaultValues はマウント時にのみ評価されるため、
 * 常時マウントで open をトグルする使い方ではプリフィルされない。
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
import { useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

type Props = {
  open: boolean;
  /** 対象項目。起動元で常に確定した状態で渡す（外部項目のみが起動対象） */
  inspectionItemId: string;
  onClose: () => void;
};

export const OrderModal = ({ open, inspectionItemId, onClose }: Props): ReactElement => {
  const inspectionItem = useAppStore((state) => state.inspectionItems[inspectionItemId]);
  const equipment = useAppStore((state) =>
    inspectionItem ? state.equipment[inspectionItem.equipmentId] : undefined,
  );
  const vendors = useAppStore((state) => state.vendors);
  const addOrder = useAppStore((state) => state.addOrder);

  const [submitFailed, setSubmitFailed] = useState(false);

  const presetVendorId = inspectionItem?.vendorId;
  const defaultVendorId =
    presetVendorId !== undefined && vendors[presetVendorId]?.isCalibrator ? presetVendorId : "";

  // なぜ defaultValues 直書きで足りるか: OrderModal は起動元で常に条件マウント（閉時アンマウント）
  // されるため、defaultValues はマウント時に1度評価されれば足り、open のたびのプリフィルは不要。
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: { ...defaultOrderFormValues, vendorId: defaultVendorId },
  });

  const calibratorVendors = Object.values(vendors).filter((vendor) => vendor.isCalibrator);
  const vendorOptions = calibratorVendors.map((vendor) => ({
    value: vendor.id,
    label: vendor.name,
  }));

  const targetLabel =
    inspectionItem && equipment
      ? `対象:${equipment.managementNo} ${equipment.name} / ${inspectionItem.name}`
      : "対象:(項目情報が見つかりません)";

  // なぜ: submitFailed を閉時にリセットし、同一対象で開き直した際の残留エラー表示を防ぐ
  // （RecordModal.tsx と同パターン。起動元のマウント方法に依存させない）。
  const handleClose = (): void => {
    setSubmitFailed(false);
    onClose();
  };

  const onSubmit = (values: OrderFormValues): void => {
    const orderId = addOrder({
      inspectionItemId,
      vendorId: values.vendorId,
      dueDate: values.dueDate || undefined,
      cost: values.cost ? Number(values.cost) : undefined,
      note: values.note || undefined,
    });
    // なぜここで setState か: react-compiler(EffectSetState) が effect 内での同期 setState を
    // 禁則とするため、submitFailed はイベントハンドラ側（onSubmit）に一本化し（RecordModal.tsx
    // と同方針）、再送信のたびに最新の結果へ更新する。
    setSubmitFailed(orderId === null);
    if (orderId === null) return;
    handleClose();
  };

  return (
    <Modal
      open={open}
      title="校正案件を追加"
      onClose={handleClose}
      isDirty={isDirty}
      footer={
        <Button type="button" onClick={handleSubmit(onSubmit)}>
          保存
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
              校正依頼先<span className="text-red-600">*</span>
            </span>
            <p className="text-sm text-slate-600">
              校正業者が未登録です
              {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計（InspectionItemModal.tsxと同様） */}
              <Link to={ROUTES.VENDOR_LIST} className="text-primary ml-1 underline">
                メーカー/取引先マスタへ
              </Link>
            </p>
          </div>
        ) : (
          <Select
            label="校正依頼先"
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
