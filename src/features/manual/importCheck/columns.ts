/**
 * CSVインポートの種類別チェック内容(利用マニュアル表示用)。
 * 列の並びは各エンティティの zod スキーマ宣言順(= CSV列順、entityCsv.ts の shape)と一致させる。
 * 一致は columns.test.ts で ENTITY_CSV_SPECS の shape キー順との突合により保証する。
 */
import { EQUIPMENT_STATUS_LABELS } from "@/features/equipment/constants";
import { NOTIFICATION_TYPE_LABELS } from "@/features/notifications/constants";
import {
  CYCLE_LABELS,
  EXECUTION_LABELS,
  SERVICE_ITEM_TYPE_LABELS,
  SERVICE_RECORD_RESULT_LABELS,
} from "@/features/serviceItems/constants";
import { SERVICE_ORDER_STATUS_LABELS } from "@/features/serviceOrder/constants";
import type { CsvEntityKind } from "@/features/settings/components/csv/entityCsv";

export const COLUMN_REQUIREMENT = {
  REQUIRED: "required",
  OPTIONAL: "optional",
  CONDITIONAL: "conditional",
} as const;
export type ColumnRequirement = (typeof COLUMN_REQUIREMENT)[keyof typeof COLUMN_REQUIREMENT];

/** 必須列は○の有無で表現する(任意は空欄)。条件付きのみ文言で示し、条件は description に記載する */
export const COLUMN_REQUIREMENT_LABELS = {
  [COLUMN_REQUIREMENT.REQUIRED]: "○",
  [COLUMN_REQUIREMENT.OPTIONAL]: "",
  [COLUMN_REQUIREMENT.CONDITIONAL]: "条件付き",
} as const satisfies Record<ColumnRequirement, string>;

export type ImportCheckColumn = {
  key: string;
  /** 画面のフォーム・一覧で使っている日本語ラベル。CSV列名と画面上の項目の対応付け用(D-061) */
  label: string;
  requirement: ColumnRequirement;
  description: string;
};

/** 列挙値の説明文をラベル定数から生成する(値の一覧と表示文言のドリフト防止)。末尾の「のいずれか」で選択式であることを明示する(D-059) */
const enumDescription = (labels: Record<string, string>): string =>
  `${Object.entries(labels)
    .map(([value, label]) => `${value}(${label})`)
    .join(" / ")} のいずれか`;

/** boolean 列の説明文。列挙値と同じ「値(意味)」形式で true/false の意味を列ごとに示す(D-059) */
const booleanDescription = (trueLabel: string, falseLabel: string): string =>
  `true(${trueLabel}) / false(${falseLabel}) のいずれか`;

/** データ定義を簡潔に書くための組み立てヘルパー */
const toColumn = (
  key: string,
  label: string,
  requirement: ColumnRequirement,
  description: string,
): ImportCheckColumn => ({
  key,
  label,
  requirement,
  description,
});

const { REQUIRED, OPTIONAL, CONDITIONAL } = COLUMN_REQUIREMENT;

const ID_DESCRIPTION = "空でない文字列。ファイル内で重複しないこと";
const OPTIONAL_TEXT_DESCRIPTION = "任意の文字列";
const REQUIRED_TEXT_DESCRIPTION = "空でない文字列";
const NONNEGATIVE_INT_DESCRIPTION = "0以上の整数";
const DATE_DESCRIPTION = "YYYY-MM-DD 形式の日付(暦上存在する日付)";

export const IMPORT_CHECK_COLUMNS: Record<CsvEntityKind, readonly ImportCheckColumn[]> = {
  equipment: [
    toColumn("id", "ID", REQUIRED, ID_DESCRIPTION),
    toColumn("managementNo", "管理番号", REQUIRED, ID_DESCRIPTION),
    toColumn("name", "機器名", REQUIRED, REQUIRED_TEXT_DESCRIPTION),
    toColumn("model", "型式", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
    toColumn("serialNo", "シリアル番号", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
    toColumn("manufacturerId", "メーカー", OPTIONAL, "登録済みのメーカー/取引先の id"),
    toColumn("location", "設置場所", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
    toColumn("status", "状態", REQUIRED, enumDescription(EQUIPMENT_STATUS_LABELS)),
    toColumn("note", "備考", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
  ],
  serviceItems: [
    toColumn("id", "ID", REQUIRED, ID_DESCRIPTION),
    toColumn("equipmentId", "機器", REQUIRED, "登録済みの機器の id"),
    toColumn("type", "種別", REQUIRED, enumDescription(SERVICE_ITEM_TYPE_LABELS)),
    toColumn("name", "項目名", REQUIRED, REQUIRED_TEXT_DESCRIPTION),
    toColumn("cycle", "周期", REQUIRED, enumDescription(CYCLE_LABELS)),
    toColumn("execution", "実施区分", REQUIRED, enumDescription(EXECUTION_LABELS)),
    toColumn(
      "vendorId",
      "校正依頼先",
      CONDITIONAL,
      "execution が external(外部)の場合は必須。登録済みのメーカー/取引先の id",
    ),
    toColumn("leadTimeDays", "納期(日)", OPTIONAL, NONNEGATIVE_INT_DESCRIPTION),
    toColumn("bufferDays", "発注余裕日", REQUIRED, NONNEGATIVE_INT_DESCRIPTION),
    toColumn("personId", "担当者", REQUIRED, "登録済みの担当者の id"),
    toColumn("noticeDaysBefore", "通知開始日数", REQUIRED, NONNEGATIVE_INT_DESCRIPTION),
    toColumn("lastDoneDate", "最終実施日", OPTIONAL, DATE_DESCRIPTION),
    toColumn("nextDueDate", "次回期限", REQUIRED, DATE_DESCRIPTION),
    toColumn("isActive", "有効", REQUIRED, booleanDescription("有効", "無効")),
  ],
  serviceRecords: [
    toColumn("id", "ID", REQUIRED, ID_DESCRIPTION),
    toColumn("serviceItemId", "点検校正項目", REQUIRED, "登録済みの点検校正項目の id"),
    toColumn("doneDate", "実施日", REQUIRED, DATE_DESCRIPTION),
    toColumn("doneBy", "実施者", REQUIRED, REQUIRED_TEXT_DESCRIPTION),
    toColumn("result", "結果", REQUIRED, enumDescription(SERVICE_RECORD_RESULT_LABELS)),
    toColumn("serviceOrderId", "点検校正外部案件", OPTIONAL, "登録済みの点検校正外部案件の id"),
    toColumn("note", "備考", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
  ],
  serviceOrders: [
    toColumn("id", "ID", REQUIRED, ID_DESCRIPTION),
    toColumn("serviceItemId", "点検校正項目", REQUIRED, "登録済みの点検校正項目の id"),
    toColumn("vendorId", "依頼先", REQUIRED, "登録済みのメーカー/取引先の id"),
    toColumn("status", "状態", REQUIRED, enumDescription(SERVICE_ORDER_STATUS_LABELS)),
    toColumn("orderedDate", "発注日", OPTIONAL, DATE_DESCRIPTION),
    toColumn("dueDate", "返却予定日", OPTIONAL, DATE_DESCRIPTION),
    toColumn("returnedDate", "実返却日", OPTIONAL, DATE_DESCRIPTION),
    toColumn("cost", "費用", OPTIONAL, "0以上の数値(小数可)"),
    toColumn("note", "備考", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
  ],
  vendors: [
    toColumn("id", "ID", REQUIRED, ID_DESCRIPTION),
    toColumn("name", "名称", REQUIRED, REQUIRED_TEXT_DESCRIPTION),
    toColumn(
      "isManufacturer",
      "メーカー",
      REQUIRED,
      booleanDescription("メーカーである", "メーカーでない"),
    ),
    toColumn(
      "isCalibrator",
      "校正業者",
      REQUIRED,
      booleanDescription("校正業者である", "校正業者でない"),
    ),
    toColumn("contactPerson", "窓口担当者", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
    toColumn("email", "メール", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
    toColumn("phone", "電話", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
    toColumn("standardLeadTimeDays", "標準納期(日)", OPTIONAL, NONNEGATIVE_INT_DESCRIPTION),
    toColumn("note", "備考", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
  ],
  persons: [
    toColumn("id", "ID", REQUIRED, ID_DESCRIPTION),
    toColumn("name", "氏名", REQUIRED, REQUIRED_TEXT_DESCRIPTION),
    toColumn("email", "メール", REQUIRED, REQUIRED_TEXT_DESCRIPTION),
    toColumn("department", "部署", OPTIONAL, OPTIONAL_TEXT_DESCRIPTION),
    toColumn("isActive", "有効", REQUIRED, booleanDescription("有効", "無効")),
  ],
  notifications: [
    toColumn("id", "ID", REQUIRED, ID_DESCRIPTION),
    toColumn("type", "種別", REQUIRED, enumDescription(NOTIFICATION_TYPE_LABELS)),
    toColumn(
      "targetType",
      "対象種別",
      REQUIRED,
      "serviceItem(点検校正項目) / serviceOrder(点検校正外部案件) のいずれか",
    ),
    toColumn(
      "targetId",
      "対象",
      REQUIRED,
      "targetType に応じて、登録済みの点検校正項目または点検校正外部案件の id",
    ),
    toColumn("personId", "宛先担当者", REQUIRED, "登録済みの担当者の id"),
    toColumn("message", "通知文", REQUIRED, REQUIRED_TEXT_DESCRIPTION),
    toColumn("createdDate", "発生日", REQUIRED, DATE_DESCRIPTION),
    toColumn("isRead", "既読", REQUIRED, booleanDescription("既読", "未読")),
  ],
};
