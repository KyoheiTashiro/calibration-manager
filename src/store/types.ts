/**
 * ドメイン型の真実源（coding-standards.md §3）。
 * zodスキーマ（./schema.ts）はこのファイルの型と AssertEqual で構造一致を強制する。
 * 属性定義は docs/domain-model.md §3 と一言一句矛盾させないこと。
 */

// なぜ「as const オブジェクト + 派生 union 型」か: 値と型を1箇所で同期させる
// プロジェクト共通イディオム（coding-standards.md §1）。

/** 点検・校正の周期（domain-model.md §1・§3.4） */
export const CYCLE = {
  M1: "1M",
  M3: "3M",
  M6: "6M",
  Y1: "1Y",
  Y2: "2Y",
  Y3: "3Y",
  Y5: "5Y",
  Y10: "10Y",
} as const;
export type Cycle = (typeof CYCLE)[keyof typeof CYCLE];

/** 機器の状態（domain-model.md §3.3）。suspended/retired は期限計算・通知の対象外 */
export const EQUIPMENT_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  RETIRED: "retired",
} as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUS)[keyof typeof EQUIPMENT_STATUS];

/** 点検校正項目の種別（domain-model.md §3.4） */
export const INSPECTION_ITEM_TYPE = {
  INSPECTION: "inspection",
  CALIBRATION: "calibration",
} as const;
export type InspectionItemType = (typeof INSPECTION_ITEM_TYPE)[keyof typeof INSPECTION_ITEM_TYPE];

/** 実施区分（domain-model.md §3.4）。external の場合のみ vendorId が必須 */
export const EXECUTION = {
  INTERNAL: "internal",
  EXTERNAL: "external",
} as const;
export type Execution = (typeof EXECUTION)[keyof typeof EXECUTION];

/** 実施記録の結果（domain-model.md §3.5）。fail は次回期限を更新しない */
export const RECORD_RESULT = {
  PASS: "pass",
  FAIL: "fail",
  ADJUSTED: "adjusted",
} as const;
export type RecordResult = (typeof RECORD_RESULT)[keyof typeof RECORD_RESULT];

/**
 * 点検校正外部案件の状態（domain-model.md §3.6）。
 * 遷移の許可判定は {@link ../domain/orderStatus.ts} の遷移テーブルが正。
 */
export const ORDER_STATUS = {
  PLANNED: "planned",
  ORDERED: "ordered",
  IN_CALIBRATION: "inCalibration",
  RETURNED: "returned",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/** 通知種別（domain-model.md §3.7）。発生条件は domain/notificationRules.ts が正 */
export const NOTIFICATION_TYPE = {
  DUE_SOON: "dueSoon",
  OVERDUE: "overdue",
  ORDER_RECOMMENDED: "orderRecommended",
  DELIVERY_DUE_SOON: "deliveryDueSoon",
  DELIVERY_OVERDUE: "deliveryOverdue",
} as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

/** 通知の対象種別（domain-model.md §3.7） */
export const NOTIFICATION_TARGET_TYPE = {
  INSPECTION_ITEM: "inspectionItem",
  ORDER: "order",
} as const;
export type NotificationTargetType =
  (typeof NOTIFICATION_TARGET_TYPE)[keyof typeof NOTIFICATION_TARGET_TYPE];

/**
 * 日付は全域 `YYYY-MM-DD`（ISO 8601 日付）の文字列で扱う（screen-design/README.md §0.4）。
 * 時刻は扱わない。ISO形式の文字列は辞書順比較が日付順比較と一致する。
 */
export type IsoDateString = string;

/** メーカー/取引先（domain-model.md §3.1）。メーカーと校正業者を区分フラグで統合 */
export type Vendor = {
  id: string;
  name: string;
  isManufacturer: boolean;
  isCalibrator: boolean;
  contactPerson?: string;
  email?: string;
  phone?: string;
  /** 標準納期（日数）。校正業者の場合に使用。inspectionItem.leadTimeDays 未設定時のフォールバック先 */
  standardLeadTimeDays?: number;
  note?: string;
};

/** 担当者（domain-model.md §3.2）。退職・異動は isActive=false（物理削除しない） */
export type Person = {
  id: string;
  name: string;
  email: string;
  department?: string;
  isActive: boolean;
};

/** 機器（domain-model.md §3.3）。削除は論理削除（retired）を基本とし履歴を保持する */
export type Equipment = {
  id: string;
  /** 管理番号（ユニーク）。ユニーク性はフォーム側で検証する */
  managementNo: string;
  name: string;
  model?: string;
  serialNo?: string;
  /** Vendor参照（メーカー） */
  manufacturerId?: string;
  location?: string;
  status: EquipmentStatus;
  note?: string;
};

/** 点検校正項目（domain-model.md §3.4）— 中核エンティティ。1機器に複数登録可能 */
export type InspectionItem = {
  id: string;
  /** Equipment参照 */
  equipmentId: string;
  type: InspectionItemType;
  name: string;
  cycle: Cycle;
  execution: Execution;
  /** 校正依頼先（Vendor参照）。execution=external の場合必須（schema.ts で強制） */
  vendorId?: string;
  /** 納期（日数）。未設定なら Vendor.standardLeadTimeDays を使用（domain-model.md §4.2） */
  leadTimeDays?: number;
  /** 発注余裕日数（デフォルト14 = domain/constants.ts の DEFAULT_BUFFER_DAYS） */
  bufferDays: number;
  /** Person参照 */
  personId: string;
  /** 通知開始日数（デフォルト30 = domain/constants.ts の DEFAULT_NOTICE_DAYS_BEFORE） */
  noticeDaysBefore: number;
  lastDoneDate?: IsoDateString;
  /** 次回期限。初回は手入力、以降は実施記録から自動計算（domain-model.md §4.1） */
  nextDueDate: IsoDateString;
  isActive: boolean;
};

/** 実施記録（domain-model.md §3.5） */
export type InspectionRecord = {
  id: string;
  /** InspectionItem参照 */
  inspectionItemId: string;
  doneDate: IsoDateString;
  /** 実施者名（外部の場合は業者名） */
  doneBy: string;
  result: RecordResult;
  /** 外部校正の場合、元になった CalibrationOrder 参照 */
  orderId?: string;
  note?: string;
};

/** 点検校正外部案件（domain-model.md §3.6）。発注1回分の進捗と納期を追跡する */
export type CalibrationOrder = {
  id: string;
  /** InspectionItem参照 */
  inspectionItemId: string;
  /** 依頼先（Vendor参照） */
  vendorId: string;
  status: OrderStatus;
  orderedDate?: IsoDateString;
  /** 返却予定日（業者回答の個別納期） */
  dueDate?: IsoDateString;
  returnedDate?: IsoDateString;
  cost?: number;
  note?: string;
};

/** アプリ内通知（domain-model.md §3.7）。メール実送信はしない */
export type Notification = {
  id: string;
  type: NotificationType;
  targetType: NotificationTargetType;
  /** 対象のID（targetType=inspectionItem なら InspectionItem、order なら CalibrationOrder） */
  targetId: string;
  /** 宛先担当者（Person参照） */
  personId: string;
  message: string;
  createdDate: IsoDateString;
  isRead: boolean;
};

/**
 * 永続化対象の全エンティティ（store.md「partialize」）。
 * アクション関数・派生値は含めない。7エンティティの Record のみ。
 */
export type AppState = {
  vendors: Record<string, Vendor>;
  persons: Record<string, Person>;
  equipment: Record<string, Equipment>;
  inspectionItems: Record<string, InspectionItem>;
  records: Record<string, InspectionRecord>;
  orders: Record<string, CalibrationOrder>;
  notifications: Record<string, Notification>;
};
