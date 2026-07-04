/**
 * 点検校正項目（InspectionItem）の追加・編集モーダル（screen-design/06-inspection-item-modal.md）。RHF + zodResolver。
 */

import {
  inspectionItemFormSchema,
  toFormValues,
  type InspectionItemFormValues,
} from "@/components/domain/InspectionItemModal/schema";
import { Button, Checkbox, DateField, Modal, RadioGroup, Select, TextField } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import {
  CYCLE_OPTIONS,
  EXECUTION_OPTIONS,
  INSPECTION_ITEM_TYPE_OPTIONS,
} from "@/features/inspectionItems/constants";
import { EXECUTION, type InspectionItem } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ChangeEvent, ReactElement } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";

type Props = {
  open: boolean;
  /** 起動元からプリセット(新規時のequipmentId。編集時はinspectionItem.equipmentIdと同値) */
  equipmentId: string;
  /** 編集対象。undefinedなら新規モード */
  inspectionItem?: InspectionItem;
  onClose: () => void;
};

// なぜ: noUncheckedIndexedAccess無効下でも実行時欠落(削除済み参照等)の可能性を型に反映するため
const pickRecord = <Value,>(record: Record<string, Value>, key: string): Value | undefined =>
  record[key];

export const InspectionItemModal = ({
  open,
  equipmentId,
  inspectionItem,
  onClose,
}: Props): ReactElement => {
  const equipment = useAppStore((state) => pickRecord(state.equipment, equipmentId));
  const vendors = useAppStore((state) => state.vendors);
  const persons = useAppStore((state) => state.persons);
  const addInspectionItem = useAppStore((state) => state.addInspectionItem);
  const updateInspectionItem = useAppStore((state) => state.updateInspectionItem);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<InspectionItemFormValues>({
    resolver: zodResolver(inspectionItemFormSchema),
    // なぜ values か: 編集対象（inspectionItem）が変わるたびに既存値をプリフィルする
    // （screen-design/README.md §0.5）。RHF が深い等価比較で変化を検知し reset する。
    values: toFormValues(inspectionItem),
  });

  // なぜ close 時に reset() を呼ぶか: values オプションは内容が変わらない限り reset しないため、
  // 同一対象を dirty のまま破棄クローズ→再オープンした場合に入力が残留してしまう。
  // close 時に明示的に reset()(引数なし)を呼び、最新の defaultValues(values由来)へ戻す。
  const handleClose = (): void => {
    reset();
    onClose();
  };

  // なぜ watch() ではなく useWatch か: VendorModal.tsx と同じ理由（react-compiler lint対策）。
  const execution = useWatch({ control, name: "execution" });

  const calibratorVendors = Object.values(vendors).filter((vendor) => vendor.isCalibrator);
  const vendorOptions = calibratorVendors.map((vendor) => ({
    value: vendor.id,
    label: vendor.name,
  }));

  const activePersons = Object.values(persons).filter((person) => person.isActive);
  const currentPerson = inspectionItem ? persons[inspectionItem.personId] : undefined;
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

  const onSubmit = (values: InspectionItemFormValues): void => {
    const isExternal = values.execution === EXECUTION.EXTERNAL;
    const hasVendorId = values.vendorId !== undefined && values.vendorId !== "";
    const hasLeadTimeDays = values.leadTimeDays !== undefined && values.leadTimeDays !== "";
    const vendorId = isExternal && hasVendorId ? values.vendorId : undefined;
    const leadTimeDays = isExternal && hasLeadTimeDays ? Number(values.leadTimeDays) : undefined;
    const bufferDays = Number(values.bufferDays);
    const noticeDaysBefore = Number(values.noticeDaysBefore);

    const payload = {
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
    };

    if (inspectionItem) {
      updateInspectionItem(inspectionItem.id, payload);
    } else {
      addInspectionItem({ ...payload, lastDoneDate: undefined });
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
      title={inspectionItem ? "点検校正項目を編集" : "点検校正項目を追加"}
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
          options={INSPECTION_ITEM_TYPE_OPTIONS}
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
          // なぜ onChange か: state 変化に反応する effect ではなくユーザー操作イベントで直接クリアする
          // (You Might Not Need an Effect)。bufferDays は必須属性のためクリアしない。
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("execution", {
            onChange: (event: ChangeEvent<HTMLInputElement>) => {
              if (event.target.value === EXECUTION.INTERNAL) {
                setValue("vendorId", "", { shouldDirty: false });
                setValue("leadTimeDays", "", { shouldDirty: false });
              }
            },
          })}
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
        <div>
          <Checkbox
            label="期限管理の対象にする"
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("isActive")}
          />
          <p className="text-xs text-slate-500">
            オフにすると点検校正項目一覧・期限管理・通知の対象外になります(機器詳細では確認できます)
          </p>
        </div>
      </div>
    </Modal>
  );
};
