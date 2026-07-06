/**
 * 点検校正項目（ServiceItem）の追加・編集モーダル。RHF + zodResolver。
 */

import { Schema, toFormValues, type FormType } from "@/components/domain/ServiceItemModal/schema";
import { Button, Checkbox, DateField, Modal, RadioGroup, Select, TextField } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import {
  CYCLE_OPTIONS,
  EXECUTION_OPTIONS,
  SERVICE_ITEM_TYPE_OPTIONS,
} from "@/features/serviceItems/constants";
import { EXECUTION, type ServiceItem } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { createSaveHandler, emptyToUndefined } from "@/utils/form";
import { recordValue } from "@/utils/record";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ChangeEvent, ReactElement } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";

type Props = {
  open: boolean;
  /** 起動元からプリセット(新規時のequipmentId。編集時はserviceItem.equipmentIdと同値) */
  equipmentId: string;
  /** 編集対象。undefinedなら新規モード */
  serviceItem?: ServiceItem;
  onClose: () => void;
};

export const ServiceItemModal = ({
  open,
  equipmentId,
  serviceItem,
  onClose,
}: Props): ReactElement => {
  const equipment = useAppStore((state) => recordValue(state.equipment, equipmentId));
  const vendors = useAppStore((state) => state.vendors);
  const persons = useAppStore((state) => state.persons);
  const addServiceItem = useAppStore((state) => state.addServiceItem);
  const updateServiceItem = useAppStore((state) => state.updateServiceItem);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormType>({
    resolver: zodResolver(Schema),
    // なぜ values か: 編集対象（serviceItem）が変わるたびに既存値をプリフィルする。
    values: toFormValues(serviceItem),
  });

  // なぜ close 時に reset() を呼ぶか: values オプションは内容が変わらない限り reset しないため、
  // 同一対象を dirty のまま破棄クローズ→再オープンした場合に入力が残留してしまう。
  // close 時に明示的に reset()(引数なし)を呼び、最新の defaultValues(values由来)へ戻す。
  const handleClose = (): void => {
    reset();
    onClose();
  };

  // なぜ watch() ではなく useWatch か: react-compiler lint対策のため。
  const execution = useWatch({ control, name: "execution" });

  const calibratorVendors = Object.values(vendors).filter((vendor) => vendor.isCalibrator);
  const vendorOptions = calibratorVendors.map((vendor) => ({
    value: vendor.id,
    label: vendor.name,
  }));

  const activePersons = Object.values(persons).filter((person) => person.isActive);
  const currentPerson = serviceItem ? persons[serviceItem.personId] : undefined;
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

  const onSubmit = (values: FormType): void => {
    const isExternal = values.execution === EXECUTION.EXTERNAL;
    const vendorIdInput = emptyToUndefined(values.vendorId);
    const leadTimeDaysInput = emptyToUndefined(values.leadTimeDays);
    const vendorId = isExternal ? vendorIdInput : undefined;
    const leadTimeDays =
      isExternal && leadTimeDaysInput !== undefined ? Number(leadTimeDaysInput) : undefined;
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

    if (serviceItem) {
      updateServiceItem(serviceItem.id, payload);
    } else {
      addServiceItem({ ...payload, lastDoneDate: undefined });
    }
    handleClose();
  };

  const handleSave = createSaveHandler(handleSubmit, onSubmit);

  return (
    <Modal
      open={open}
      title={serviceItem ? "点検校正項目を編集" : "点検校正項目を追加"}
      onClose={handleClose}
      isDirty={isDirty}
      footer={<Button onClick={handleSave}>保存</Button>}
    >
      <div className="flex flex-col gap-4">
        <div>
          <span className="block text-sm text-slate-700">対象機器</span>
          <p className="text-sm text-slate-800">{equipmentLabel}</p>
        </div>
        <TextField label="項目名" required error={errors.name?.message} {...register("name")} />
        <RadioGroup
          label="種別"
          required
          options={SERVICE_ITEM_TYPE_OPTIONS}
          error={errors.type?.message}
          {...register("type")}
        />
        <Select
          label="周期"
          required
          options={CYCLE_OPTIONS}
          error={errors.cycle?.message}
          {...register("cycle")}
        />
        <RadioGroup
          label="実施区分"
          required
          options={EXECUTION_OPTIONS}
          error={errors.execution?.message}
          // なぜ onChange か: state 変化に反応する effect ではなくユーザー操作イベントで直接クリアする。
          // bufferDays は必須属性のためクリアしない。
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
            <TextField
              label="納期(日)"
              type="number"
              error={errors.leadTimeDays?.message}
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
            {...register("personId")}
          />
        )}
        <TextField
          label="通知開始日数"
          type="number"
          required
          error={errors.noticeDaysBefore?.message}
          {...register("noticeDaysBefore")}
        />
        <div>
          <DateField
            label="次回期限"
            required
            error={errors.nextDueDate?.message}
            {...register("nextDueDate")}
          />
          <p className="text-xs text-slate-500">
            ※新規のみ手入力。以降は実施記録から自動計算されます
          </p>
        </div>
        <div>
          <Checkbox label="期限管理の対象にする" {...register("isActive")} />
          <p className="text-xs text-slate-500">
            オフにすると点検校正項目一覧・期限管理・通知の対象外になります(機器詳細では確認できます)
          </p>
        </div>
      </div>
    </Modal>
  );
};
