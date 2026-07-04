/**
 * Vendor（メーカー/取引先）の追加・編集モーダル（screen-design/09-masters.md §9-A）。
 * RHF + zodResolver。送信ボタンはエラー時も無効化せず、送信試行でエラー表示する
 * （screen-design/README.md §0.5）。
 */

import { vendorFormSchema, type VendorFormValues } from "@/components/domain/VendorModal/schema";
import { Button, Checkbox, Modal, TextField } from "@/components/ui";
import type { Vendor } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ChangeEvent, ReactElement } from "react";
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
    // なぜ values か: 編集対象（vendor）が変わるたびに既存値をプリフィルする
    // （screen-design/README.md §0.5）。RHF が深い等価比較で変化を検知し reset する。
    values: toFormValues(vendor),
  });

  // なぜ watch() ではなく useWatch か: watch() が返す購読値は React Compiler が
  // 安全にメモ化できず lint(react-compiler)がエラーになるため、フックとして使える
  // useWatch を用いる（PersonModal.tsx と異なりVendorModalは条件表示のため購読が必要）。
  const isManufacturer = useWatch({ control, name: "isManufacturer" });
  const isCalibrator = useWatch({ control, name: "isCalibrator" });

  // なぜ close 時に reset() を呼ぶか: values オプションは内容が変わらない限り reset しないため、
  // 同一対象を dirty のまま破棄クローズ→再オープンした場合に入力が残留してしまう。
  // close 時に明示的に reset()（引数なし）を呼び、最新の defaultValues（values由来）へ戻す。
  const handleClose = (): void => {
    reset();
    onClose();
  };

  const onSubmit = (values: VendorFormValues): void => {
    const hasContactPerson = values.contactPerson !== undefined && values.contactPerson !== "";
    const hasEmail = values.email !== undefined && values.email !== "";
    const hasPhone = values.phone !== undefined && values.phone !== "";
    const hasStandardLeadTimeDays =
      values.standardLeadTimeDays !== undefined && values.standardLeadTimeDays !== "";
    const hasNote = values.note !== undefined && values.note !== "";
    const payload = {
      name: values.name,
      isManufacturer: values.isManufacturer,
      isCalibrator: values.isCalibrator,
      contactPerson: hasContactPerson ? values.contactPerson : undefined,
      email: hasEmail ? values.email : undefined,
      phone: hasPhone ? values.phone : undefined,
      standardLeadTimeDays:
        values.isCalibrator && hasStandardLeadTimeDays
          ? Number(values.standardLeadTimeDays)
          : undefined,
      note: hasNote ? values.note : undefined,
    };
    if (vendor) {
      updateVendor(vendor.id, payload);
    } else {
      addVendor(payload);
    }
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
      title={vendor ? "取引先を編集" : "取引先を追加"}
      onClose={handleClose}
      isDirty={isDirty}
      footer={
        <Button type="button" onClick={handleSave}>
          保存
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label="名称" required error={errors.name?.message} {...register("name")} />
        <Checkbox label="メーカー" {...register("isManufacturer")} />
        <Checkbox
          label="校正業者"
          // なぜ onChange でクリアするか: isCalibrator オフ時は「標準納期(日)」を非表示にするだけでなく
          // 入力値もクリアし、再度オンにしても古い値が復活しないようにする（タスク仕様）。
          // state 変化に反応する effect ではなくユーザー操作イベントで直接処理する。
          {...register("isCalibrator", {
            onChange: (event: ChangeEvent<HTMLInputElement>) => {
              if (!event.target.checked) {
                setValue("standardLeadTimeDays", "", { shouldDirty: false });
              }
            },
          })}
        />
        {!isManufacturer && !isCalibrator ? (
          <p role="alert" className="text-xs text-orange-600">
            メーカー・校正業者のどちらにも該当しません
          </p>
        ) : null}
        <TextField
          label="窓口担当者"
          error={errors.contactPerson?.message}
          {...register("contactPerson")}
        />
        <TextField
          label="メール"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField label="電話" error={errors.phone?.message} {...register("phone")} />
        {isCalibrator ? (
          <TextField
            label="標準納期(日)"
            type="number"
            error={errors.standardLeadTimeDays?.message}
            {...register("standardLeadTimeDays")}
          />
        ) : null}
        <TextField label="備考" error={errors.note?.message} {...register("note")} />
      </div>
    </Modal>
  );
};
