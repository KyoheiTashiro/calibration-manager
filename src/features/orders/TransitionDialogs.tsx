/**
 * かんばんの入力付き遷移ダイアログ（screen-design/08-orders.md、README §0.5）。RHF + zodResolver。
 * - OrderDialog: planned → ordered（発注日・返却予定日・費用）
 * - ReturnDialog: inCalibration → returned（実返却日）
 * updateOrderStatus が true のときのみ属性を updateOrder で patch する。false（遷移不可・競合）なら
 * patch せず閉じる（silent no-op）。日付整合の不一致は警告表示のみでブロックしない（decisions.md D-019）。
 */

// oxlint-disable react/no-multi-comp -- OrderDialog/ReturnDialog はかんばんの入力付き遷移ダイアログを
// 対で扱う密結合コンポーネント（同一スキーマ設計・同一 updateOrderStatus→updateOrder パターン）であり、
// coding-standards.md §2「サブコンポーネントが複数なら…」の範囲内でこの1ファイルに集約する設計判断のため緩和する。

import {
  orderDialogSchema,
  returnDialogSchema,
  type OrderDialogValues,
  type ReturnDialogValues,
} from "@/features/orders/schema";
import { Button, DateField, Modal, TextField } from "@/components/ui";
import { ORDER_STATUS, type CalibrationOrder } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { isIsoDateString, todayIsoDate } from "@/utils/time";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactElement } from "react";
import { useForm, useWatch } from "react-hook-form";

type DialogProps = {
  /** 対象案件。id と現状態のみ参照する */
  order: CalibrationOrder;
  onClose: () => void;
};

export const OrderDialog = ({ order, onClose }: DialogProps): ReactElement => {
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);
  const updateOrder = useAppStore((state) => state.updateOrder);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<OrderDialogValues>({
    resolver: zodResolver(orderDialogSchema),
    defaultValues: { orderedDate: todayIsoDate(), dueDate: "", cost: "" },
  });

  // なぜ useWatch か: ItemModal と同じ理由（react-compiler lint 対策で watch() を使わない）。
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

  const onSubmit = (values: OrderDialogValues): void => {
    const transitioned = updateOrderStatus(order.id, ORDER_STATUS.ORDERED);
    if (transitioned) {
      updateOrder(order.id, {
        orderedDate: values.orderedDate,
        dueDate: values.dueDate === "" ? undefined : values.dueDate,
        cost: values.cost === "" ? undefined : Number(values.cost),
      });
    }
    onClose();
  };

  return (
    <Modal
      open
      title="発注する"
      onClose={onClose}
      isDirty={isDirty}
      footer={
        <Button type="button" onClick={handleSubmit(onSubmit)}>
          確定
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <DateField
          label="発注日"
          required
          error={errors.orderedDate?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("orderedDate")}
        />
        <DateField
          label="返却予定日"
          error={errors.dueDate?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("dueDate")}
        />
        {showDueDateWarning ? (
          <p className="text-xs text-amber-600">発注日が返却予定日より後になっています</p>
        ) : null}
        <TextField
          label="費用"
          type="number"
          error={errors.cost?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("cost")}
        />
      </div>
    </Modal>
  );
};

export const ReturnDialog = ({ order, onClose }: DialogProps): ReactElement => {
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);
  const updateOrder = useAppStore((state) => state.updateOrder);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<ReturnDialogValues>({
    resolver: zodResolver(returnDialogSchema),
    defaultValues: { returnedDate: todayIsoDate() },
  });

  const returnedDate = useWatch({ control, name: "returnedDate" });

  // D-019: 発注日 > 実返却日 は警告のみ。発注日は案件の保存値を使う。
  const showReturnWarning =
    order.orderedDate !== undefined &&
    typeof returnedDate === "string" &&
    isIsoDateString(returnedDate) &&
    order.orderedDate > returnedDate;

  const onSubmit = (values: ReturnDialogValues): void => {
    const transitioned = updateOrderStatus(order.id, ORDER_STATUS.RETURNED);
    if (transitioned) {
      updateOrder(order.id, { returnedDate: values.returnedDate });
    }
    onClose();
  };

  return (
    <Modal
      open
      title="返却する"
      onClose={onClose}
      isDirty={isDirty}
      footer={
        <Button type="button" onClick={handleSubmit(onSubmit)}>
          確定
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <DateField
          label="実返却日"
          required
          error={errors.returnedDate?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("returnedDate")}
        />
        {showReturnWarning ? (
          <p className="text-xs text-amber-600">発注日が実返却日より後になっています</p>
        ) : null}
      </div>
    </Modal>
  );
};
