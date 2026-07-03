/**
 * 実施記録（InspectionRecord）の登録モーダル（screen-design/07-record-modal.md）。RHF + zodResolver。
 * 対象項目は常に確定した状態で起動元から渡される。登録時の期限更新・案件完了カスケードは
 * ストア層 addRecord が担う（inspectionRecordSlice.ts）。
 */

import { recordFormSchema, type RecordFormValues } from "@/components/domain/RecordModal/schema";
import { Button, DateField, Modal, RadioGroup, TextField } from "@/components/ui";
import { RECORD_RESULT_OPTIONS } from "@/features/inspectionItems/constants";
import {
  EXECUTION,
  RECORD_RESULT,
  type CalibrationOrder,
  type InspectionItem,
  type Vendor,
} from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { todayIsoDate } from "@/utils/time";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactElement } from "react";
import { useForm, useWatch, type DefaultValues } from "react-hook-form";

type Props = {
  open: boolean;
  /** 対象項目。起動元で常に確定した状態で渡す */
  inspectionItemId: string;
  /** 案件経由起動時のみ指定(returned 案件)。記録に紐付き completed 連鎖する */
  orderId?: string;
  onClose: () => void;
};

/**
 * doneBy プリフィル値を解決する（D-017 の解決順）:
 * ①案件経由 → 当該案件の業者名、②項目が external → 項目の業者名、
 * ③internal または Vendor 解決不能 → 空欄。
 */
const resolvePrefillDoneBy = (
  inspectionItem: InspectionItem | undefined,
  order: CalibrationOrder | undefined,
  vendors: Record<string, Vendor>,
): string => {
  if (order) return vendors[order.vendorId]?.name ?? "";
  if (inspectionItem?.execution === EXECUTION.EXTERNAL && inspectionItem.vendorId) {
    return vendors[inspectionItem.vendorId]?.name ?? "";
  }
  return "";
};

export const RecordModal = ({ open, inspectionItemId, orderId, onClose }: Props): ReactElement => {
  const inspectionItem = useAppStore((state) => state.inspectionItems[inspectionItemId]);
  const equipment = useAppStore((state) => (inspectionItem ? state.equipment[inspectionItem.equipmentId] : undefined));
  const vendors = useAppStore((state) => state.vendors);
  const order = useAppStore((state) => (orderId ? state.orders[orderId] : undefined));
  const addRecord = useAppStore((state) => state.addRecord);

  const [submitFailed, setSubmitFailed] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(recordFormSchema),
  });

  // なぜ: open/対象変更のたびにプリフィルし直す（screen-design/README.md §0.5、InspectionItemModal と同パターン）。
  // なぜ result を undefined か: 既定選択なし（未選択で送信すると zod エラー）とするため。
  useEffect(() => {
    const defaults: DefaultValues<RecordFormValues> = {
      doneDate: todayIsoDate(),
      doneBy: resolvePrefillDoneBy(inspectionItem, order, vendors),
      result: undefined,
      note: "",
    };
    reset(defaults);
  }, [open, inspectionItemId, orderId, inspectionItem, order, vendors, reset]);

  // なぜ watch() ではなく useWatch か: InspectionItemModal の execution 監視と同じ理由（react-compiler lint対策）。
  const result = useWatch({ control, name: "result" });
  const doneDate = useWatch({ control, name: "doneDate" });

  const isFutureDoneDate = typeof doneDate === "string" && doneDate > todayIsoDate();
  const orderVendorName = order ? (vendors[order.vendorId]?.name ?? "") : "";

  const targetLabel =
    inspectionItem && equipment
      ? `対象:${equipment.managementNo} ${equipment.name} / ${inspectionItem.name}`
      : "対象:(項目情報が見つかりません)";

  // なぜ: submitFailed を閉時にリセットし、同一対象で開き直した際の残留エラー表示を防ぐ
  // （起動元の key remount に依存させない。かんばん等どのマウント方法でも安全にする）。
  const handleClose = (): void => {
    setSubmitFailed(false);
    onClose();
  };

  const onSubmit = (values: RecordFormValues): void => {
    const recordId = addRecord({
      inspectionItemId,
      doneDate: values.doneDate,
      doneBy: values.doneBy,
      result: values.result,
      note: values.note === "" ? undefined : values.note,
      orderId,
    });
    // なぜここで両分岐 setState か: 破棄確認を出さないため submitFailed はイベントハンドラで
    // 更新し（effect 内 setState を避ける）、再送信ごとに最新の結果へ更新する。
    setSubmitFailed(recordId === null);
    if (recordId === null) return;
    handleClose();
  };

  return (
    <Modal
      open={open}
      title="実施記録を追加"
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
        {orderId ? (
          <p className="text-primary text-sm">
            案件連携:{orderVendorName} の案件と紐付けて登録します(登録で記録登録済になります)
          </p>
        ) : null}
        <div>
          <DateField
            label="実施日"
            required
            error={errors.doneDate?.message}
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("doneDate")}
          />
          {isFutureDoneDate ? <p className="text-xs text-amber-600">実施日が未来日です</p> : null}
        </div>
        <TextField
          label="実施者"
          required
          error={errors.doneBy?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("doneBy")}
        />
        <RadioGroup
          label="結果"
          required
          options={RECORD_RESULT_OPTIONS}
          error={errors.result?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("result")}
        />
        {result === RECORD_RESULT.FAIL ? (
          <p className="text-xs text-slate-600">次回期限は更新されません</p>
        ) : null}
        <TextField
          label="備考"
          error={errors.note?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("note")}
        />
        {submitFailed ? (
          <p className="text-sm text-red-600">
            登録できませんでした。データの状態を確認してください
          </p>
        ) : null}
      </div>
    </Modal>
  );
};
