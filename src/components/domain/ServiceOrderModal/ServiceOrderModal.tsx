/**
 * 点検校正外部案件（ServiceOrder）の新規作成モーダル（screen-design/08-service-orders.md「案件作成モーダル」）。
 * RHF + zodResolver。起動元は項目一覧の「案件」アクション（外部・有効案件なしの項目）。
 * 新規作成専用（status は常に addServiceOrder が
 * planned 固定で付与するため渡さない)。1項目1有効案件制約（D-006）はストア層 addServiceOrder が最終防衛線。
 * 呼び出し元は閉時アンマウント（条件マウント）必須。defaultValues はマウント時にのみ評価されるため、
 * 常時マウントで open をトグルする使い方ではプリフィルされない。
 */

import {
  defaultServiceOrderFormValues,
  serviceOrderFormSchema,
  type ServiceOrderFormValues,
} from "@/components/domain/ServiceOrderModal/schema";
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
  serviceItemId: string;
  onClose: () => void;
};

// なぜ: noUncheckedIndexedAccess無効下でも実行時欠落(削除済み参照等)の可能性を型に反映するため
const pickRecord = <Value,>(record: Record<string, Value>, key: string): Value | undefined =>
  record[key];

export const ServiceOrderModal = ({ open, serviceItemId, onClose }: Props): ReactElement => {
  const serviceItem = useAppStore((state) =>
    pickRecord(state.serviceItems, serviceItemId),
  );
  const equipment = useAppStore((state) =>
    serviceItem ? pickRecord(state.equipment, serviceItem.equipmentId) : undefined,
  );
  const vendors = useAppStore((state) => state.vendors);
  const addServiceOrder = useAppStore((state) => state.addServiceOrder);

  const [submitFailed, setSubmitFailed] = useState(false);

  const presetVendorId = serviceItem?.vendorId;
  const defaultVendorId =
    presetVendorId !== undefined && vendors[presetVendorId]?.isCalibrator ? presetVendorId : "";

  // なぜ defaultValues 直書きで足りるか: ServiceOrderModal は起動元で常に条件マウント（閉時アンマウント）
  // されるため、defaultValues はマウント時に1度評価されれば足り、open のたびのプリフィルは不要。
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(serviceOrderFormSchema),
    defaultValues: { ...defaultServiceOrderFormValues, vendorId: defaultVendorId },
  });

  const calibratorVendors = Object.values(vendors).filter((vendor) => vendor.isCalibrator);
  const vendorOptions = calibratorVendors.map((vendor) => ({
    value: vendor.id,
    label: vendor.name,
  }));

  const targetLabel =
    serviceItem && equipment
      ? `対象:${equipment.managementNo} ${equipment.name} / ${serviceItem.name}`
      : "対象:(項目情報が見つかりません)";

  // なぜ: submitFailed を閉時にリセットし、同一対象で開き直した際の残留エラー表示を防ぐ
  // （RecordModal.tsx と同パターン。起動元のマウント方法に依存させない）。
  const handleClose = (): void => {
    setSubmitFailed(false);
    onClose();
  };

  const onSubmit = (values: ServiceOrderFormValues): void => {
    const hasDueDate = values.dueDate !== undefined && values.dueDate !== "";
    const hasCost = values.cost !== undefined && values.cost !== "";
    const hasNote = values.note !== undefined && values.note !== "";
    const serviceOrderId = addServiceOrder({
      serviceItemId,
      vendorId: values.vendorId,
      dueDate: hasDueDate ? values.dueDate : undefined,
      cost: hasCost ? Number(values.cost) : undefined,
      note: hasNote ? values.note : undefined,
    });
    // なぜここで setState か: react-compiler(EffectSetState) が effect 内での同期 setState を
    // 禁則とするため、submitFailed はイベントハンドラ側（onSubmit）に一本化し（RecordModal.tsx
    // と同方針）、再送信のたびに最新の結果へ更新する。
    setSubmitFailed(serviceOrderId === null);
    if (serviceOrderId === null) return;
    handleClose();
  };

  // なぜcatchで終端するか: no-void下でfloating promiseを残さないため(onSubmitは例外を投げない設計)。
  const handleSave = (): void => {
    handleSubmit(onSubmit)().catch(() => {
      // onSubmitは例外を投げない設計のため到達しない想定
    });
  };

  return (
    <Modal
      open={open}
      title="点検校正外部案件を追加"
      onClose={handleClose}
      isDirty={isDirty}
      footer={
        <Button type="button" onClick={handleSave}>
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
            {...register("vendorId")}
          />
        )}
        <DateField label="返却予定日" error={errors.dueDate?.message} {...register("dueDate")} />
        <TextField label="費用" type="number" error={errors.cost?.message} {...register("cost")} />
        <TextField label="備考" error={errors.note?.message} {...register("note")} />
        {submitFailed ? (
          <p role="alert" className="text-xs text-red-600">
            この項目には進行中の案件が既に存在します
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
