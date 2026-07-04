/**
 * 実施記録（ServiceRecord）の登録モーダル（screen-design/07-record-modal.md）。RHF + zodResolver。
 * 対象項目は常に確定した状態で起動元から渡される。登録時の期限更新・案件完了カスケードは
 * ストア層 addRecord が担う（serviceRecordSlice.ts）。
 * 呼び出し元は閉時アンマウント（条件マウント）必須。defaultValues はマウント時にのみ評価されるため、
 * 常時マウントで open をトグルする使い方ではプリフィルされない。
 */

import { recordFormSchema, type RecordFormValues } from "@/components/domain/RecordModal/schema";
import { Button, DateField, Modal, RadioGroup, TextField } from "@/components/ui";
import { RECORD_RESULT_OPTIONS } from "@/features/serviceItems/constants";
import {
  EXECUTION,
  RECORD_RESULT,
  type ServiceOrder,
  type ServiceItem,
  type Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { todayIsoDate } from "@/utils/time";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactElement } from "react";
import { useForm, useWatch, type DefaultValues } from "react-hook-form";

type Props = {
  open: boolean;
  /** 対象項目。起動元で常に確定した状態で渡す */
  serviceItemId: string;
  /** 案件経由起動時のみ指定(returned 案件)。記録に紐付き completed 連鎖する */
  serviceOrderId?: string;
  onClose: () => void;
};

// なぜ: noUncheckedIndexedAccess無効下でも実行時欠落(削除済み参照等)の可能性を型に反映するため
const pickRecord = <Value,>(record: Record<string, Value>, key: string): Value | undefined =>
  record[key];

/**
 * doneBy プリフィル値を解決する（D-017 の解決順）:
 * ①案件経由 → 当該案件の業者名、②項目が external → 項目の業者名、
 * ③internal または Vendor 解決不能 → 空欄。
 */
const resolvePrefillDoneBy = (
  serviceItem: ServiceItem | undefined,
  serviceOrder: ServiceOrder | undefined,
  vendors: Record<string, Vendor>,
): string => {
  if (serviceOrder) return pickRecord(vendors, serviceOrder.vendorId)?.name ?? "";
  if (serviceItem !== undefined && serviceItem.execution === EXECUTION.EXTERNAL) {
    const { vendorId } = serviceItem;
    if (vendorId !== undefined && vendorId !== "") {
      return pickRecord(vendors, vendorId)?.name ?? "";
    }
  }
  return "";
};

export const RecordModal = ({
  open,
  serviceItemId,
  serviceOrderId,
  onClose,
}: Props): ReactElement => {
  const serviceItem = useAppStore((state) => pickRecord(state.serviceItems, serviceItemId));
  const equipment = useAppStore((state) =>
    serviceItem ? pickRecord(state.equipment, serviceItem.equipmentId) : undefined,
  );
  const vendors = useAppStore((state) => state.vendors);
  const hasServiceOrderId = serviceOrderId !== undefined && serviceOrderId !== "";
  const serviceOrder = useAppStore((state) =>
    hasServiceOrderId ? pickRecord(state.serviceOrders, serviceOrderId) : undefined,
  );
  const addRecord = useAppStore((state) => state.addRecord);

  const [submitFailed, setSubmitFailed] = useState(false);

  // なぜ defaultValues 直書きで足りるか: RecordModal は起動元で常に条件マウント（閉時アンマウント）
  // されるため、defaultValues はマウント時に1度評価されれば足り、open のたびのプリフィルは不要。
  // なぜ result を undefined か: 既定選択なし（未選択で送信すると zod エラー）とするため。
  const defaultValues: DefaultValues<RecordFormValues> = {
    doneDate: todayIsoDate(),
    doneBy: resolvePrefillDoneBy(serviceItem, serviceOrder, vendors),
    result: undefined,
    note: "",
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(recordFormSchema),
    defaultValues,
  });

  // なぜ watch() ではなく useWatch か: ServiceItemModal の execution 監視と同じ理由（react-compiler lint対策）。
  const result = useWatch({ control, name: "result" });
  const doneDate = useWatch({ control, name: "doneDate" });

  const isFutureDoneDate = typeof doneDate === "string" && doneDate > todayIsoDate();
  const serviceOrderVendorName = serviceOrder
    ? (pickRecord(vendors, serviceOrder.vendorId)?.name ?? "")
    : "";

  const targetLabel =
    serviceItem && equipment
      ? `対象:${equipment.managementNo} ${equipment.name} / ${serviceItem.name}`
      : "対象:(項目情報が見つかりません)";

  // なぜ: submitFailed を閉時にリセットし、同一対象で開き直した際の残留エラー表示を防ぐ
  // （起動元の key remount に依存させない。かんばん等どのマウント方法でも安全にする）。
  const handleClose = (): void => {
    setSubmitFailed(false);
    onClose();
  };

  const onSubmit = (values: RecordFormValues): void => {
    const recordId = addRecord({
      serviceItemId,
      doneDate: values.doneDate,
      doneBy: values.doneBy,
      result: values.result,
      note: values.note === "" ? undefined : values.note,
      serviceOrderId,
    });
    // なぜここで両分岐 setState か: 破棄確認を出さないため submitFailed はイベントハンドラで
    // 更新し（effect 内 setState を避ける）、再送信ごとに最新の結果へ更新する。
    setSubmitFailed(recordId === null);
    if (recordId === null) return;
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
      title="実施記録を登録"
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
        {hasServiceOrderId ? (
          <p className="text-primary text-sm">
            案件連携:{serviceOrderVendorName} の案件と紐付けて登録します(登録で記録登録済になります)
          </p>
        ) : null}
        <div>
          <DateField
            label="実施日"
            required
            error={errors.doneDate?.message}
            {...register("doneDate")}
          />
          {isFutureDoneDate ? <p className="text-xs text-amber-600">実施日が未来日です</p> : null}
        </div>
        <TextField label="実施者" required error={errors.doneBy?.message} {...register("doneBy")} />
        <RadioGroup
          label="結果"
          required
          options={RECORD_RESULT_OPTIONS}
          error={errors.result?.message}
          {...register("result")}
        />
        {result === RECORD_RESULT.FAIL ? (
          <p className="text-xs text-slate-600">次回期限は更新されません</p>
        ) : null}
        <TextField label="備考" error={errors.note?.message} {...register("note")} />
        {submitFailed ? (
          <p className="text-sm text-red-600">
            登録できませんでした。データの状態を確認してください
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
