import { equipmentDetailPath } from '@/constants/routes';
import { isActiveServiceOrderStatus } from '@/domain/serviceOrderStatus';
import { toEquipmentPayload, type SelectOption } from '@/features/equipment/form/shared/mapping';
import { defaultValues, type FormType } from '@/features/equipment/form/shared/schema';
import { useEquipmentFormCore } from '@/features/equipment/form/shared/useFormCore';
import { EQUIPMENT_STATUS, type Equipment } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { useSafeNavigate } from '@/utils/navigation';
import { recordValue } from '@/utils/record';
import { useState } from 'react';
import type { Control, FieldErrors, UseFormHandleSubmit, UseFormRegister } from 'react-hook-form';
import { useParams } from 'react-router-dom';

// なぜ undefined を許容するか: Rules of Hooks により対象不在（dangling id・URL直打ち等）でも
// フックは無条件に実行されるため、currentEquipment が undefined の場合のフォールバック
// （新規時と同じ defaultValues）を用意しておく必要がある。
const toFormValues = (equipment: Equipment | undefined): FormType =>
  equipment
    ? {
        managementNo: equipment.managementNo,
        name: equipment.name,
        model: equipment.model ?? '',
        serialNo: equipment.serialNo ?? '',
        manufacturerId: equipment.manufacturerId ?? '',
        location: equipment.location ?? '',
        status: equipment.status,
        note: equipment.note ?? '',
      }
    : defaultValues;

type UseEditEquipmentFormResult = {
  shouldRedirectToList: boolean;
  register: UseFormRegister<FormType>;
  errors: FieldErrors<FormType>;
  control: Control<FormType>;
  onFormSubmit: ReturnType<UseFormHandleSubmit<FormType>>;
  manufacturerOptions: SelectOption[];
  retireConfirmOpen: boolean;
  /** 廃棄対象の機器に残っている進行中（planned〜returned）の案件数 */
  retireActiveServiceOrderCount: number;
  cancelServiceOrdersOnRetire: boolean;
  setCancelServiceOrdersOnRetire: (cancel: boolean) => void;
  closeRetireConfirm: () => void;
  handleRetireConfirm: () => void;
  handleCancel: () => void;
};

export const useEditEquipmentForm = (): UseEditEquipmentFormResult => {
  const { id } = useParams<{ id: string }>();
  const safeNavigate = useSafeNavigate();

  const equipmentMap = useAppStore((state) => state.equipment);
  const updateEquipment = useAppStore((state) => state.updateEquipment);
  const serviceItems = useAppStore((state) => state.serviceItems);
  const serviceOrders = useAppStore((state) => state.serviceOrders);
  const cancelServiceOrder = useAppStore((state) => state.cancelServiceOrder);

  const currentEquipment = id === undefined ? undefined : equipmentMap[id];

  // 廃棄（retired）への変更確認ダイアログを表示中、保存待ちの入力値を保持しておく。
  // ダイアログを経由しない通常保存では使わない。null 以外の間はダイアログ表示中を意味する。
  // cancelServiceOrders は「進行中の案件も中止する」の選択（既定は残す。D-109）。
  const [pendingRetire, setPendingRetire] = useState<{
    values: FormType;
    cancelServiceOrders: boolean;
  } | null>(null);

  const activeServiceOrders = Object.values(serviceOrders).filter(
    (serviceOrder) =>
      isActiveServiceOrderStatus(serviceOrder.status) &&
      recordValue(serviceItems, serviceOrder.serviceItemId)?.equipmentId === id,
  );

  const currentFormValues = toFormValues(currentEquipment);

  // 編集画面はルートページで対象（currentEquipment）が変わる場合のみ内容を更新すればよいため
  // values を渡す。defaultValues は初回マウント時（currentEquipment 未確定タイミング含む）用に残す。
  const { register, errors, control, handleSubmit, manufacturerOptions } = useEquipmentFormCore({
    defaultValues: currentFormValues,
    values: currentFormValues,
    excludeEquipmentId: id,
  });

  const persist = (values: FormType): void => {
    if (currentEquipment === undefined) return;
    updateEquipment(currentEquipment.id, toEquipmentPayload(values));
    safeNavigate(equipmentDetailPath(currentEquipment.id));
  };

  const onSubmit = (values: FormType): void => {
    if (currentEquipment === undefined) return;
    // status セレクトで retired 以外から retired への変更のみ確認ダイアログを挟む。
    // 既に retired の機器を retired のまま保存する場合は確認不要で即保存する。
    const isRetiring =
      currentEquipment.status !== EQUIPMENT_STATUS.RETIRED &&
      values.status === EQUIPMENT_STATUS.RETIRED;
    if (isRetiring) {
      setPendingRetire({ values, cancelServiceOrders: false });
      return;
    }
    persist(values);
  };

  const handleRetireConfirm = (): void => {
    if (pendingRetire === null) return;
    if (pendingRetire.cancelServiceOrders) {
      for (const serviceOrder of activeServiceOrders) cancelServiceOrder(serviceOrder.id);
    }
    persist(pendingRetire.values);
    setPendingRetire(null);
  };

  return {
    // 編集対象が存在しない（dangling id・URL直打ち等）場合は一覧へリダイレクトする
    // （domain-model.md の「dangling FKでもユーザーデータは保持」とは別軸の、画面パラメータ不正時のガード）。
    shouldRedirectToList: currentEquipment === undefined,
    register,
    errors,
    control,
    onFormSubmit: handleSubmit(onSubmit),
    manufacturerOptions,
    retireConfirmOpen: pendingRetire !== null,
    retireActiveServiceOrderCount: activeServiceOrders.length,
    cancelServiceOrdersOnRetire: pendingRetire?.cancelServiceOrders ?? false,
    setCancelServiceOrdersOnRetire: (cancel): void => {
      setPendingRetire((current) =>
        current === null ? null : { ...current, cancelServiceOrders: cancel },
      );
    },
    closeRetireConfirm: (): void => {
      // キャンセル時は保存しない。フォームの編集内容はRHF側の状態のまま保持されるため
      // pendingRetire を破棄するだけでよい。
      setPendingRetire(null);
    },
    handleRetireConfirm,
    handleCancel: (): void => {
      safeNavigate(-1);
    },
  };
};
