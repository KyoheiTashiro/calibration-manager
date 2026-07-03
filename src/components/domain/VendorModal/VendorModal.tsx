/**
 * Vendor（メーカー/取引先）の追加・編集モーダル（screen-design/09-masters.md §9-A）。
 * RHF + zodResolver。送信ボタンはエラー時も無効化せず、送信試行でエラー表示する
 * （screen-design/README.md §0.5）。
 */

import { Button, Checkbox, Modal, TextField } from "@/components/ui";
import { vendorFormSchema, type VendorFormValues } from "@/features/vendors/schema";
import type { Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import { useForm, useWatch } from "react-hook-form";

type Props = {
  open: boolean;
  vendor?: Vendor;
  onClose: () => void;
};

const emptyFormValues: VendorFormValues = {
  name: "",
  isManufacturer: false,
  isCalibrator: false,
  contactPerson: "",
  email: "",
  phone: "",
  standardLeadTimeDays: "",
  note: "",
};

/** 既存 Vendor をフォーム値（すべて string ベース）へ変換する。新規時は空値 */
const toFormValues = (vendor: Vendor | undefined): VendorFormValues =>
  vendor
    ? {
        name: vendor.name,
        isManufacturer: vendor.isManufacturer,
        isCalibrator: vendor.isCalibrator,
        contactPerson: vendor.contactPerson ?? "",
        email: vendor.email ?? "",
        phone: vendor.phone ?? "",
        standardLeadTimeDays: vendor.standardLeadTimeDays?.toString() ?? "",
        note: vendor.note ?? "",
      }
    : emptyFormValues;

export const VendorModal = ({ open, vendor, onClose }: Props): ReactElement => {
  const addVendor = useAppStore((state) => state.addVendor);
  const updateVendor = useAppStore((state) => state.updateVendor);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: toFormValues(vendor),
  });

  // なぜ: モーダル起動（open）または編集対象（vendor）が変わるたびに既存値をプリフィルする
  // （screen-design/README.md §0.5「モーダル起動時、対象を編集する場合は既存値をプリフィル」）。
  useEffect(() => {
    reset(toFormValues(vendor));
  }, [open, vendor, reset]);

  // なぜ watch() ではなく useWatch か: watch() が返す購読値は React Compiler が
  // 安全にメモ化できず lint(react-compiler)がエラーになるため、フックとして使える
  // useWatch を用いる（PersonModal.tsx と異なりVendorModalは条件表示のため購読が必要）。
  const isManufacturer = useWatch({ control, name: "isManufacturer" });
  const isCalibrator = useWatch({ control, name: "isCalibrator" });

  // なぜ: isCalibrator を true→false に切り替えたら「標準納期(日)」フィールドを非表示にするだけでなく
  // 入力値もクリアする（タスク仕様）。setValue で明示的に空へ戻すことで、再度 true に戻しても
  // 古い値が復活しない。
  useEffect(() => {
    if (!isCalibrator) {
      setValue("standardLeadTimeDays", "", { shouldDirty: false });
    }
  }, [isCalibrator, setValue]);

  const onSubmit = (values: VendorFormValues): void => {
    const payload = {
      name: values.name,
      isManufacturer: values.isManufacturer,
      isCalibrator: values.isCalibrator,
      contactPerson: values.contactPerson || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      standardLeadTimeDays:
        values.isCalibrator && values.standardLeadTimeDays
          ? Number(values.standardLeadTimeDays)
          : undefined,
      note: values.note || undefined,
    };
    if (vendor) {
      updateVendor(vendor.id, payload);
    } else {
      addVendor(payload);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={vendor ? "取引先の編集" : "取引先の追加"}
      onClose={onClose}
      isDirty={isDirty}
      footer={
        <Button type="button" onClick={handleSubmit(onSubmit)}>
          保存
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="名称"
          required
          error={errors.name?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("name")}
        />
        <Checkbox
          label="メーカー"
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("isManufacturer")}
        />
        <Checkbox
          label="校正業者"
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("isCalibrator")}
        />
        {!isManufacturer && !isCalibrator ? (
          <p role="alert" className="text-xs text-orange-600">
            メーカー・校正業者のどちらにも該当しません
          </p>
        ) : null}
        <TextField
          label="窓口担当者"
          error={errors.contactPerson?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("contactPerson")}
        />
        <TextField
          label="メール"
          type="email"
          error={errors.email?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("email")}
        />
        <TextField
          label="電話"
          error={errors.phone?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("phone")}
        />
        {isCalibrator ? (
          <TextField
            label="標準納期(日)"
            type="number"
            error={errors.standardLeadTimeDays?.message}
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("standardLeadTimeDays")}
          />
        ) : null}
        <TextField
          label="備考"
          error={errors.note?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("note")}
        />
      </div>
    </Modal>
  );
};
