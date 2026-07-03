/**
 * 点検校正項目（InspectionItem）の追加・編集モーダル（screen-design/06-item-modal.md）。RHF + zodResolver。
 */

import {
  defaultItemFormValues,
  itemFormSchema,
  type ItemFormValues,
} from "@/components/domain/ItemModal/schema";
import { Button, Checkbox, DateField, Modal, RadioGroup, Select, TextField } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { CYCLE_OPTIONS, EXECUTION_OPTIONS, ITEM_TYPE_OPTIONS } from "@/features/items/constants";
import { EXECUTION, type InspectionItem } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactElement } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";

type Props = {
  open: boolean;
  /** 起動元からプリセット(新規時のequipmentId。編集時はitem.equipmentIdと同値) */
  equipmentId: string;
  /** 編集対象。undefinedなら新規モード */
  item?: InspectionItem;
  onClose: () => void;
};

/** 既存 InspectionItem をフォーム値（すべて string ベース）へ変換する。新規時は既定値 */
const toFormValues = (item: InspectionItem | undefined): ItemFormValues =>
  item
    ? {
        name: item.name,
        type: item.type,
        cycle: item.cycle,
        execution: item.execution,
        vendorId: item.vendorId ?? "",
        leadTimeDays: item.leadTimeDays?.toString() ?? "",
        bufferDays: item.bufferDays.toString(),
        personId: item.personId,
        noticeDaysBefore: item.noticeDaysBefore.toString(),
        nextDueDate: item.nextDueDate,
        isActive: item.isActive,
      }
    : defaultItemFormValues;

export const ItemModal = ({ open, equipmentId, item, onClose }: Props): ReactElement => {
  const equipment = useAppStore((state) => state.equipment[equipmentId]);
  const vendors = useAppStore((state) => state.vendors);
  const persons = useAppStore((state) => state.persons);
  const addItem = useAppStore((state) => state.addItem);
  const updateItem = useAppStore((state) => state.updateItem);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: toFormValues(item),
  });

  // なぜ: open/item変更のたびに既存値をプリフィルする（screen-design/README.md §0.5）。
  useEffect(() => {
    reset(toFormValues(item));
  }, [open, item, reset]);

  // なぜ watch() ではなく useWatch か: VendorModal.tsx と同じ理由（react-compiler lint対策）。
  const execution = useWatch({ control, name: "execution" });

  // なぜ: internal切替時はvendorId/leadTimeDaysをクリア。bufferDaysは必須属性のためクリアしない。
  useEffect(() => {
    if (execution === EXECUTION.INTERNAL) {
      setValue("vendorId", "", { shouldDirty: false });
      setValue("leadTimeDays", "", { shouldDirty: false });
    }
  }, [execution, setValue]);

  const calibratorVendors = Object.values(vendors).filter((vendor) => vendor.isCalibrator);
  const vendorOptions = calibratorVendors.map((vendor) => ({
    value: vendor.id,
    label: vendor.name,
  }));

  const activePersons = Object.values(persons).filter((person) => person.isActive);
  const currentPerson = item ? persons[item.personId] : undefined;
  // なぜ: D-012。現担当が無効化済みの項目編集時のみ、選択肢末尾に「(無効)」付きで含める
  // （新規時はcurrentPerson===undefinedのため含まれない）。
  const currentPersonIsInactive = currentPerson !== undefined && !currentPerson.isActive;
  const personOptions = [
    ...activePersons.map((person) => ({ value: person.id, label: person.name })),
    ...(currentPersonIsInactive
      ? [{ value: currentPerson.id, label: `${currentPerson.name}(無効)` }]
      : []),
  ];

  const equipmentLabel = equipment
    ? `${equipment.managementNo} ${equipment.name}`
    : "(機器情報が見つかりません)";

  const onSubmit = (values: ItemFormValues): void => {
    const isExternal = values.execution === EXECUTION.EXTERNAL;
    const vendorId = isExternal && values.vendorId ? values.vendorId : undefined;
    const leadTimeDays =
      isExternal && values.leadTimeDays ? Number(values.leadTimeDays) : undefined;
    const bufferDays = Number(values.bufferDays);
    const noticeDaysBefore = Number(values.noticeDaysBefore);

    if (item) {
      updateItem(item.id, {
        equipmentId,
        type: values.type,
        name: values.name,
        cycle: values.cycle,
        execution: values.execution,
        vendorId,
        leadTimeDays,
        bufferDays,
        personId: values.personId,
        noticeDaysBefore,
        nextDueDate: values.nextDueDate,
        isActive: values.isActive,
      });
    } else {
      addItem({
        equipmentId,
        type: values.type,
        name: values.name,
        cycle: values.cycle,
        execution: values.execution,
        vendorId,
        leadTimeDays,
        bufferDays,
        personId: values.personId,
        noticeDaysBefore,
        lastDoneDate: undefined,
        nextDueDate: values.nextDueDate,
        isActive: values.isActive,
      });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={item ? "点検校正項目を編集" : "点検校正項目を追加"}
      onClose={onClose}
      isDirty={isDirty}
      footer={
        <Button type="button" onClick={handleSubmit(onSubmit)}>
          保存
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <span className="block text-sm text-slate-700">対象機器</span>
          <p className="text-sm text-slate-800">{equipmentLabel}</p>
        </div>
        <TextField
          label="項目名"
          required
          error={errors.name?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("name")}
        />
        <RadioGroup
          label="種別"
          required
          options={ITEM_TYPE_OPTIONS}
          error={errors.type?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("type")}
        />
        <Select
          label="周期"
          required
          options={CYCLE_OPTIONS}
          error={errors.cycle?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("cycle")}
        />
        <RadioGroup
          label="実施区分"
          required
          options={EXECUTION_OPTIONS}
          error={errors.execution?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("execution")}
        />
        {execution === EXECUTION.EXTERNAL ? (
          <div className="border-line flex flex-col gap-4 border-t pt-4">
            {calibratorVendors.length === 0 ? (
              <div>
                <span className="block text-sm text-slate-700">
                  校正依頼先<span className="text-red-600">*</span>
                </span>
                <p className="text-sm text-slate-600">
                  校正業者が未登録です
                  {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計（equipment/form/index.tsxと同様） */}
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
            <TextField
              label="納期(日)"
              type="number"
              error={errors.leadTimeDays?.message}
              // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
              {...register("leadTimeDays")}
            />
            <p className="text-xs text-slate-500">
              空欄の場合は校正依頼先の標準納期(日)を使用します
            </p>
            <TextField
              label="発注余裕日"
              type="number"
              required
              error={errors.bufferDays?.message}
              // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
              {...register("bufferDays")}
            />
          </div>
        ) : null}
        {personOptions.length === 0 ? (
          <div>
            <span className="block text-sm text-slate-700">
              担当者<span className="text-red-600">*</span>
            </span>
            <p className="text-sm text-slate-600">
              有効な担当者がいません
              {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計（equipment/form/index.tsxと同様） */}
              <Link to={ROUTES.PERSON_LIST} className="text-primary ml-1 underline">
                担当者マスタへ
              </Link>
            </p>
          </div>
        ) : (
          <Select
            label="担当者"
            required
            placeholder="選択してください"
            options={personOptions}
            error={errors.personId?.message}
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("personId")}
          />
        )}
        <TextField
          label="通知開始日数"
          type="number"
          required
          error={errors.noticeDaysBefore?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("noticeDaysBefore")}
        />
        <div>
          <DateField
            label="次回期限"
            required
            error={errors.nextDueDate?.message}
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("nextDueDate")}
          />
          <p className="text-xs text-slate-500">
            ※新規のみ手入力。以降は実施記録から自動計算されます
          </p>
        </div>
        <Checkbox
          label="有効"
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("isActive")}
        />
      </div>
    </Modal>
  );
};
