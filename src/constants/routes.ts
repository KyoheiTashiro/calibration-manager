/**
 * ルートパス定数（screen-design/README.md §0.2 のルーティング一覧に対応）。
 * ルート定義（App.tsx）とサイドバー・画面間リンクはすべてこの定数を参照し、
 * パス文字列のハードコードを禁止する。
 */
export const ROUTES = {
  DASHBOARD: "/",
  EQUIPMENT_LIST: "/equipment",
  EQUIPMENT_CREATE: "/equipment/create",
  EQUIPMENT_DETAIL: "/equipment/:id",
  EQUIPMENT_EDIT: "/equipment/:id/edit",
  INSPECTION_ITEM_LIST: "/inspection-items",
  ORDER_LIST: "/orders",
  VENDOR_LIST: "/vendors",
  PERSON_LIST: "/persons",
  NOTIFICATION_LIST: "/notifications",
  SETTINGS: "/settings",
  MANUAL: "/manual",
} as const;
export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/** 機器詳細への実パス（`:id` を解決したリンク先）を組み立てる */
export const equipmentDetailPath = (equipmentId: string): string => `/equipment/${equipmentId}`;

/** 機器編集への実パス（`:id` を解決したリンク先）を組み立てる */
export const equipmentEditPath = (equipmentId: string): string => `/equipment/${equipmentId}/edit`;
