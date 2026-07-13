import { equipmentDetailPath } from "@/constants/routes";
import { toEquipmentPayload, type SelectOption } from "@/features/equipment/form/shared/mapping";
import { defaultValues, type FormType } from "@/features/equipment/form/shared/schema";
import { useEquipmentFormCore } from "@/features/equipment/form/shared/useFormCore";
import { EQUIPMENT_STATUS, type Equipment } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useSafeNavigate } from "@/utils/navigation";
import { useState } from "react";
import type { FieldErrors, UseFormHandleSubmit, UseFormRegister } from "react-hook-form";
import { useParams } from "react-router-dom";

// なぜ undefined を許容するか: Rules of Hooks により対象不在（dangling id・URL直打ち等）でも
// フックは無条件に実行されるため、currentEquipment が undefined の場合のフォールバック
// （新規時と同じ defaultValues）を用意しておく必要がある。
const toFormValues = (equipment: Equipment | undefined): FormType =>
  equipment
    ? {
        managementNo: equipment.managementNo,
        name: equipment.name,
        model: equipment.model ?? "",
        serialNo: equipment.serialNo ?? "",
        manufacturerId: equipment.manufacturerId ?? "",
        location: equipment.location ?? "",
        status: equipment.status,
        note: equipment.note ?? "",
      }
    : defaultValues;

type UseEditEquipmentFormResult = {
  shouldRedirectToList: boolean;
  register: UseFormRegister<FormType>;
  errors: FieldErrors<FormType>;
  onFormSubmit: ReturnType<UseFormHandleSubmit<FormType>>;
  manufacturerOptions: SelectOption[];
  retireConfirmOpen: boolean;
  closeRetireConfirm: () => void;
  handleRetireConfirm: () => void;
  handleCancel: () => void;
};

export const useEditEquipmentForm = (): UseEditEquipmentFormResult => {
  const { id } = useParams<{ id: string }>();
  const safeNavigate = useSafeNavigate();

  const equipmentMap = useAppStore((state) => state.equipment);
  const updateEquipment = useAppStore((state) => state.updateEquipment);

  const currentEquipment = id === undefined ? undefined : equipmentMap[id];

  // 廃棄（retired）への変更確認ダイアログを表示中、保存待ちの入力値を保持しておく。
  // ダイアログを経由しない通常保存では使わない。
  const [pendingValues, setPendingValues] = useState<FormType | null>(null);
  const [retireConfirmOpen, setRetireConfirmOpen] = useState(false);

  const currentFormValues = toFormValues(currentEquipment);

  // 編集画面はルートページで対象（currentEquipment）が変わる場合のみ内容を更新すればよいため
  // values を渡す。defaultValues は初回マウント時（currentEquipment 未確定タイミング含む）用に残す。
  const { register, errors, handleSubmit, manufacturerOptions } = useEquipmentFormCore({
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
      setPendingValues(values);
      setRetireConfirmOpen(true);
      return;
    }
    persist(values);
  };

  const handleRetireConfirm = (): void => {
    if (pendingValues !== null) persist(pendingValues);
    setRetireConfirmOpen(false);
    setPendingValues(null);
  };

  return {
    // 編集対象が存在しない（dangling id・URL直打ち等）場合は一覧へリダイレクトする
    // （domain-model.md の「dangling FKでもユーザーデータは保持」とは別軸の、画面パラメータ不正時のガード）。
    shouldRedirectToList: currentEquipment === undefined,
    register,
    errors,
    onFormSubmit: handleSubmit(onSubmit),
    manufacturerOptions,
    retireConfirmOpen,
    closeRetireConfirm: (): void => {
      // キャンセル時は保存しない。フォームの編集内容はRHF側の状態のまま保持されるため
      // pendingValues を破棄するだけでよい。
      setRetireConfirmOpen(false);
      setPendingValues(null);
    },
    handleRetireConfirm,
    handleCancel: (): void => {
      safeNavigate(-1);
    },
  };
};
