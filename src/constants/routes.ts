/**
 * ルート定義（App.tsx）とサイドバー・画面間リンクはすべてこの定数を参照し、
 * パス文字列のハードコードを禁止する。
 */
export const ROUTES = {
  DASHBOARD: "/",
  EQUIPMENT_LIST: "/equipment",
  EQUIPMENT_CREATE: "/equipment/create",
  EQUIPMENT_DETAIL: "/equipment/:id",
  EQUIPMENT_EDIT: "/equipment/:id/edit",
  SERVICE_ITEM_LIST: "/service-items",
  SERVICE_ORDER_LIST: "/service-orders",
  VENDOR_LIST: "/vendors",
  PERSON_LIST: "/persons",
  NOTIFICATION_LIST: "/notifications",
  SETTINGS: "/settings",
  MANUAL: "/manual",
} as const;

export const equipmentDetailPath = (equipmentId: string): string => `/equipment/${equipmentId}`;

export const equipmentEditPath = (equipmentId: string): string => `/equipment/${equipmentId}/edit`;
