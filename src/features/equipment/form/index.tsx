/**
 * 機器登録・編集画面（screen-design/03-equipment-form.md）。
 * URL `/equipment/new`（新規登録）/ `/equipment/:id/edit`（編集）を1コンポーネントで共有し、
 * `useParams` の `id` の有無でモードを判定する。
 * 送信ボタンは検証エラー時も無効化せず、送信試行でエラー表示する（screen-design/README.md §0.5）。
 * 「廃棄にする」（編集時のみ）は破壊的操作のため ConfirmModal で確認する（README §0.6）。
 */

import { Button, ConfirmModal, Select, Textarea, TextField } from "@/components/ui";
import { ROUTES, equipmentDetailPath } from "@/constants/routes";
import { EQUIPMENT_STATUS_LABELS } from "@/features/equipment/constants";
import {
  createEquipmentFormSchema,
  type EquipmentFormValues,
} from "@/features/equipment/form/schema";
import { EQUIPMENT_STATUS, type Equipment } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

const emptyFormValues: EquipmentFormValues = {
  managementNo: "",
  name: "",
  model: "",
  serialNo: "",
  manufacturerId: "",
  location: "",
  status: EQUIPMENT_STATUS.ACTIVE,
  note: "",
};

/** 既存 Equipment をフォーム値（すべて string ベース）へ変換する。新規時は空値 */
const toFormValues = (equipment: Equipment | undefined): EquipmentFormValues =>
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
    : emptyFormValues;

const statusOptions = Object.entries(EQUIPMENT_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const EquipmentForm = (): ReactElement => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = id !== undefined;

  const equipmentMap = useAppStore((state) => state.equipment);
  const vendors = useAppStore((state) => state.vendors);
  const addEquipment = useAppStore((state) => state.addEquipment);
  const updateEquipment = useAppStore((state) => state.updateEquipment);
  const setEquipmentStatus = useAppStore((state) => state.setEquipmentStatus);

  const currentEquipment = id === undefined ? undefined : equipmentMap[id];

  const [retireConfirmOpen, setRetireConfirmOpen] = useState(false);

  // なぜ: ユニーク検証は「自身以外」の管理番号一覧を対象にする（編集時に自身の値を再送信しても
  // エラーにしないため）。新規時は id が undefined なので誰も除外されない。
  const existingManagementNumbers = useMemo(
    () =>
      Object.values(equipmentMap)
        .filter((entry) => entry.id !== id)
        .map((entry) => entry.managementNo),
    [equipmentMap, id],
  );

  // なぜ Object.values(vendors) を useMemo 内で算出するか: vendors オブジェクト自体を
  // 依存配列に入れれば、ストアが実際に変わらない限り Object.values の再生成は起きず
  // resolver も不要に再生成されない（manufacturerOptions と同じパターン）。
  const resolver = useMemo(
    () => zodResolver(createEquipmentFormSchema(existingManagementNumbers, Object.values(vendors))),
    [existingManagementNumbers, vendors],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EquipmentFormValues>({
    resolver,
    defaultValues: toFormValues(currentEquipment),
  });

  // なぜ: 編集対象（currentEquipment）が変わるたびに既存値をプリフィルする
  // （screen-design/README.md §0.5「対象を編集する場合は既存値をプリフィルする」と同方針）。
  useEffect(() => {
    reset(toFormValues(currentEquipment));
  }, [currentEquipment, reset]);

  const manufacturerOptions = Object.values(vendors)
    .filter((vendor) => vendor.isManufacturer)
    .toSorted((left, right) => left.name.localeCompare(right.name, "ja"))
    .map((vendor) => ({ value: vendor.id, label: vendor.name }));

  // なぜ: 編集モードで対象が存在しない（dangling id・URL直打ち等）場合は一覧へリダイレクトする
  // （タスク仕様。domain-model.md の「dangling FKでもユーザーデータは保持」とは別軸の、
  // 画面パラメータ不正時のガード）。
  if (isEditMode && currentEquipment === undefined) {
    return <Navigate to={ROUTES.EQUIPMENT_LIST} replace />;
  }

  const onSubmit = (values: EquipmentFormValues): void => {
    const payload = {
      managementNo: values.managementNo,
      name: values.name,
      model: values.model || undefined,
      serialNo: values.serialNo || undefined,
      manufacturerId: values.manufacturerId || undefined,
      location: values.location || undefined,
      status: values.status,
      note: values.note || undefined,
    };
    if (currentEquipment) {
      updateEquipment(currentEquipment.id, payload);
      navigate(equipmentDetailPath(currentEquipment.id));
    } else {
      const newId = addEquipment(payload);
      navigate(equipmentDetailPath(newId));
    }
  };

  const handleRetireConfirm = (): void => {
    if (currentEquipment === undefined) return;
    setEquipmentStatus(currentEquipment.id, EQUIPMENT_STATUS.RETIRED);
    setRetireConfirmOpen(false);
    navigate(equipmentDetailPath(currentEquipment.id));
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{isEditMode ? "機器を編集" : "機器を登録"}</h1>

      {/* なぜ noValidate か: 必須項目は TextField の required 属性経由でネイティブHTML5検証も
          有効になるが、本画面の検証はRHF+zodに一本化し「送信試行でエラー表示」する方針
          （screen-design/README.md §0.5）のため、ブラウザ標準の検証UIを無効化する。 */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-xl flex-col gap-4">
        <TextField
          label="管理番号"
          required
          error={errors.managementNo?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("managementNo")}
        />
        <TextField
          label="機器名"
          required
          error={errors.name?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("name")}
        />
        <TextField
          label="型式"
          error={errors.model?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("model")}
        />
        <TextField
          label="シリアル番号"
          error={errors.serialNo?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("serialNo")}
        />
        {manufacturerOptions.length === 0 ? (
          <div>
            <span className="block text-sm text-slate-700">メーカー</span>
            <p className="text-sm text-slate-600">
              メーカーが未登録です。マスタから登録してください
              {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計（Badgeと同様） */}
              <Link to={ROUTES.VENDOR_LIST} className="text-primary ml-1 underline">
                メーカーマスタへ
              </Link>
            </p>
          </div>
        ) : (
          <Select
            label="メーカー"
            placeholder="選択してください"
            options={manufacturerOptions}
            error={errors.manufacturerId?.message}
            // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
            {...register("manufacturerId")}
          />
        )}
        <TextField
          label="設置場所"
          error={errors.location?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("location")}
        />
        <Select
          label="状態"
          required
          options={statusOptions}
          error={errors.status?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("status")}
        />
        <Textarea
          label="備考"
          error={errors.note?.message}
          // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
          {...register("note")}
        />

        <div className="flex items-center justify-between pt-2">
          <div>
            {isEditMode && (
              <Button type="button" variant="danger" onClick={() => setRetireConfirmOpen(true)}>
                廃棄にする
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              キャンセル
            </Button>
            <Button type="submit">保存</Button>
          </div>
        </div>
      </form>

      <ConfirmModal
        open={retireConfirmOpen}
        title="機器の廃棄"
        message="この機器を廃棄にしますか?"
        confirmLabel="廃棄にする"
        danger
        onConfirm={handleRetireConfirm}
        onCancel={() => setRetireConfirmOpen(false)}
      />
    </div>
  );
};
