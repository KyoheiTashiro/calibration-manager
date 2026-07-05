/**
 * かんばんの入力付き遷移ダイアログ（screen-design/08-service-orders.md、README §0.5）。RHF + zodResolver。
 * - ServiceOrderDialog: planned → ordered（発注日・返却予定日・費用）
 * - ReturnDialog: inCalibration → returned（実返却日）
 * updateServiceOrderStatus が true のときのみ属性を updateServiceOrder で patch する。false（遷移不可・競合）なら
 * patch せず閉じる（silent no-op）。日付整合の不一致は警告表示のみでブロックしない（D-019）。
 */

// oxlint-disable react/no-multi-comp -- ServiceOrderDialog/ReturnDialog はかんばんの入力付き遷移ダイアログを
// 対で扱う密結合コンポーネント（同一スキーマ設計・同一 updateServiceOrderStatus→updateServiceOrder パターン）であり、
// coding-standards.md §2「サブコンポーネントが複数なら…」の範囲内でこの1ファイルに集約する設計判断のため緩和する。

import { Button, DateField, Modal, TextField } from "@/components/ui";
import {
  Schema as orderDialogSchema,
  defaultValues as orderDialogDefaultValues,
  type FormType as OrderDialogFormType,
} from "@/features/serviceOrder/orderDialog/schema";
import {
  Schema as returnDialogSchema,
  type FormType as ReturnDialogFormType,
} from "@/features/serviceOrder/returnDialog/schema";
import { SERVICE_ORDER_STATUS, type ServiceOrder } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { createSaveHandler } from "@/utils/form";
import { isIsoDateString, todayIsoDate } from "@/utils/time";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactElement } from "react";
import { useForm, useWatch } from "react-hook-form";

type Props = {
  /** 対象案件。id と現状態のみ参照する */
  serviceOrder: ServiceOrder;
  onClose: () => void;
};

export const ServiceOrderDialog = ({ serviceOrder, onClose }: Props): ReactElement => {
  const updateServiceOrderStatus = useAppStore((state) => state.updateServiceOrderStatus);
  const updateServiceOrder = useAppStore((state) => state.updateServiceOrder);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<OrderDialogFormType>({
    resolver: zodResolver(orderDialogSchema),
    defaultValues: { ...orderDialogDefaultValues, orderedDate: todayIsoDate() },
  });

  // なぜ useWatch か: ServiceItemModal と同じ理由（react-compiler lint 対策で watch() を使わない）。
  const orderedDate = useWatch({ control, name: "orderedDate" });
  const dueDate = useWatch({ control, name: "dueDate" });

  // D-019: 発注日 > 返却予定日 は警告のみ。両方が妥当な日付のときだけ比較する。
  const showDueDateWarning =
    typeof orderedDate === "string" &&
    isIsoDateString(orderedDate) &&
    typeof dueDate === "string" &&
    dueDate !== "" &&
    isIsoDateString(dueDate) &&
    orderedDate > dueDate;

  const onSubmit = (values: OrderDialogFormType): void => {
    const transitioned = updateServiceOrderStatus(serviceOrder.id, SERVICE_ORDER_STATUS.ORDERED);
    if (transitioned) {
      updateServiceOrder(serviceOrder.id, {
        orderedDate: values.orderedDate,
        dueDate: values.dueDate === "" ? undefined : values.dueDate,
        cost: values.cost === "" ? undefined : Number(values.cost),
      });
    }
    onClose();
  };

  const handleSave = createSaveHandler(handleSubmit, onSubmit);

  return (
    <Modal
      open
      title="発注する"
      onClose={onClose}
      isDirty={isDirty}
      footer={
        <Button type="button" onClick={handleSave}>
          確定
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <DateField
          label="発注日"
          required
          error={errors.orderedDate?.message}
          {...register("orderedDate")}
        />
        <DateField label="返却予定日" error={errors.dueDate?.message} {...register("dueDate")} />
        {showDueDateWarning ? (
          <p className="text-xs text-amber-600">発注日が返却予定日より後になっています</p>
        ) : null}
        <TextField label="費用" type="number" error={errors.cost?.message} {...register("cost")} />
      </div>
    </Modal>
  );
};

export const ReturnDialog = ({ serviceOrder, onClose }: Props): ReactElement => {
  const updateServiceOrderStatus = useAppStore((state) => state.updateServiceOrderStatus);
  const updateServiceOrder = useAppStore((state) => state.updateServiceOrder);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<ReturnDialogFormType>({
    resolver: zodResolver(returnDialogSchema),
    defaultValues: { returnedDate: todayIsoDate() },
  });

  const returnedDate = useWatch({ control, name: "returnedDate" });

  // D-019: 発注日 > 実返却日 は警告のみ。発注日は案件の保存値を使う。
  const showReturnWarning =
    serviceOrder.orderedDate !== undefined &&
    typeof returnedDate === "string" &&
    isIsoDateString(returnedDate) &&
    serviceOrder.orderedDate > returnedDate;

  const onSubmit = (values: ReturnDialogFormType): void => {
    const transitioned = updateServiceOrderStatus(serviceOrder.id, SERVICE_ORDER_STATUS.RETURNED);
    if (transitioned) {
      updateServiceOrder(serviceOrder.id, { returnedDate: values.returnedDate });
    }
    onClose();
  };

  const handleSave = createSaveHandler(handleSubmit, onSubmit);

  return (
    <Modal
      open
      title="返却する"
      onClose={onClose}
      isDirty={isDirty}
      footer={
        <Button type="button" onClick={handleSave}>
          確定
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <DateField
          label="実返却日"
          required
          error={errors.returnedDate?.message}
          {...register("returnedDate")}
        />
        {showReturnWarning ? (
          <p className="text-xs text-amber-600">発注日が実返却日より後になっています</p>
        ) : null}
      </div>
    </Modal>
  );
};
