/**
 * 通知5種別の発生条件判定（domain-model.md §3.7）。
 * ストアに依存しない純粋関数。ストアの `generateNotifications` はこの判定結果と
 * 既存の通知を突き合わせ、同一（targetType, targetId, type）の未読通知が既に存在する
 * 場合は生成をスキップする（重複抑止はストア側の責務。store.md「アクション仕様」）。
 */

import { DELIVERY_DUE_SOON_NOTICE_DAYS } from "@/domain/constants";
import { recommendedOrderDate } from "@/domain/leadTime";
import { isActiveServiceOrderStatus } from "@/domain/serviceOrderStatus";
import {
  type ServiceOrder,
  type Equipment,
  EXECUTION,
  type ServiceItem,
  type IsoDateString,
  NOTIFICATION_TARGET_TYPE,
  NOTIFICATION_TYPE,
  type Notification,
  SERVICE_ORDER_STATUS,
  type Vendor,
} from "@/store/types";
import { recordValue } from "@/utils/record";
import { addDays } from "@/utils/time";

/**
 * 生成すべき通知の判定結果。id・createdDate・isRead はストア側が付与する
 * （純粋関数はID生成・現在時刻という副作用に触れないため）。
 */
export type NotificationSeed = Omit<Notification, "id" | "createdDate" | "isRead">;

/**
 * 通知文の先頭に付ける機器の管理番号プレフィックス（screen-design/10-notifications.md の文例準拠）。
 * 参照先の機器が見つからない場合（dangling FK）は項目名のみの通知文になる。
 */
const messagePrefix = (serviceItem: ServiceItem, equipment: Record<string, Equipment>): string => {
  const managementNo = recordValue(equipment, serviceItem.equipmentId)?.managementNo;
  return managementNo === undefined ? "" : `${managementNo} `;
};

/** 1項目に対する serviceItem 宛先通知（dueSoon / overdue / orderRecommended）を判定する */
const serviceItemNotificationSeeds = (
  serviceItem: ServiceItem,
  serviceOrders: readonly ServiceOrder[],
  vendors: Record<string, Vendor>,
  equipment: Record<string, Equipment>,
  today: IsoDateString,
): NotificationSeed[] => {
  const seeds: NotificationSeed[] = [];
  const prefix = messagePrefix(serviceItem, equipment);
  const baseSeed = {
    targetType: NOTIFICATION_TARGET_TYPE.SERVICE_ITEM,
    targetId: serviceItem.id,
    personId: serviceItem.personId,
  } as const;

  if (today > serviceItem.nextDueDate) {
    seeds.push({
      ...baseSeed,
      type: NOTIFICATION_TYPE.OVERDUE,
      message: `${prefix}${serviceItem.name}が期限を過ぎています`,
    });
  } else {
    const dueSoonFrom = addDays(serviceItem.nextDueDate, -serviceItem.noticeDaysBefore);
    if (dueSoonFrom !== null && today >= dueSoonFrom) {
      seeds.push({
        ...baseSeed,
        type: NOTIFICATION_TYPE.DUE_SOON,
        message: `${prefix}${serviceItem.name}の期限が近づいています`,
      });
    }
  }

  if (serviceItem.execution === EXECUTION.EXTERNAL) {
    const vendor =
      serviceItem.vendorId === undefined
        ? null
        : (recordValue(vendors, serviceItem.vendorId) ?? null);
    const orderDate = recommendedOrderDate(serviceItem, vendor);
    const hasActiveServiceOrder = serviceOrders.some(
      (serviceOrder) =>
        serviceOrder.serviceItemId === serviceItem.id &&
        isActiveServiceOrderStatus(serviceOrder.status),
    );
    if (orderDate !== null && today >= orderDate && !hasActiveServiceOrder) {
      seeds.push({
        ...baseSeed,
        type: NOTIFICATION_TYPE.ORDER_RECOMMENDED,
        message: `${prefix}${serviceItem.name}の発注時期です`,
      });
    }
  }

  return seeds;
};

/**
 * 1案件に対する serviceOrder 宛先通知（deliveryDueSoon / deliveryOverdue）を判定する。
 * 対象は発注済かつ未返却（ordered / inCalibration）で返却予定日が入力済みの案件のみ。
 * 宛先: ServiceOrder は personId を持たないため、serviceItemId から項目を辿って
 * serviceItem.personId を宛先とする（store.md「アクション仕様」）。項目を辿れない案件は対象外。
 */
const serviceOrderNotificationSeeds = (
  serviceOrder: ServiceOrder,
  serviceItemById: ReadonlyMap<string, ServiceItem>,
  equipment: Record<string, Equipment>,
  today: IsoDateString,
): NotificationSeed[] => {
  const isAwaitingReturn =
    serviceOrder.status === SERVICE_ORDER_STATUS.ORDERED ||
    serviceOrder.status === SERVICE_ORDER_STATUS.IN_CALIBRATION;
  if (!isAwaitingReturn || serviceOrder.dueDate === undefined) return [];
  const serviceItem = serviceItemById.get(serviceOrder.serviceItemId);
  if (!serviceItem) return [];

  const prefix = messagePrefix(serviceItem, equipment);
  const baseSeed = {
    targetType: NOTIFICATION_TARGET_TYPE.SERVICE_ORDER,
    targetId: serviceOrder.id,
    personId: serviceItem.personId,
  } as const;

  if (today > serviceOrder.dueDate) {
    return [
      {
        ...baseSeed,
        type: NOTIFICATION_TYPE.DELIVERY_OVERDUE,
        message: `${prefix}${serviceItem.name}の返却予定日を過ぎています`,
      },
    ];
  }

  const noticeFrom = addDays(serviceOrder.dueDate, -DELIVERY_DUE_SOON_NOTICE_DAYS);
  if (noticeFrom !== null && today >= noticeFrom) {
    return [
      {
        ...baseSeed,
        type: NOTIFICATION_TYPE.DELIVERY_DUE_SOON,
        message: `${prefix}${serviceItem.name}の返却予定日が近づいています`,
      },
    ];
  }

  return [];
};

/**
 * 今日の時点で発生すべき通知を判定する（domain-model.md §3.7 の5種別）。
 *
 * | type | 対象 | 発生条件 |
 * |---|---|---|
 * | dueSoon | 内部・外部 | 今日 ≥ 期限 − noticeDaysBefore |
 * | overdue | 内部・外部 | 今日 > 期限 |
 * | orderRecommended | 外部のみ | 今日 ≥ 発注推奨日 かつ 未発注（有効な案件なし） |
 * | deliveryDueSoon | 発注済案件 | 今日 ≥ 返却予定日 − 7日 かつ 未返却 |
 * | deliveryOverdue | 発注済案件 | 今日 > 返却予定日 かつ 未返却 |
 *
 * 実装判断（ドメインモデルの表に対する明確化。テストで固定する）:
 * - overdue と dueSoon の条件は重なるため、期限超過後はより深刻な overdue のみを生成し
 *   dueSoon は生成しない（deliveryOverdue / deliveryDueSoon も同様）。同一項目への
 *   二重通知はノイズになるため（D-041）。
 * - 「未発注」は「有効な案件（planned〜returned）が1件もない」と解釈する。planned の
 *   案件があれば発注準備は着手済みであり、発注推奨の再通知は不要なため
 *   （§4.3 orderNow の「有効な案件なし」と同じ判定に揃える。D-042）。
 *
 * @param serviceItems 判定対象の項目。休止・廃棄機器の項目や無効項目の除外は呼び出し側
 *   （ストアの generateNotifications）の責務（store.md）
 * @param serviceOrders 全案件。項目との対応は serviceItemId で内部照合する。serviceItems に含まれない項目の
 *   案件は判定対象外
 * @param vendors 発注推奨日の納期フォールバック解決に使用
 * @param equipment 通知文の管理番号表示に使用
 */
export const computeExpectedNotifications = (
  serviceItems: readonly ServiceItem[],
  serviceOrders: readonly ServiceOrder[],
  vendors: Record<string, Vendor>,
  equipment: Record<string, Equipment>,
  today: IsoDateString,
): NotificationSeed[] => {
  const serviceItemById = new Map(serviceItems.map((serviceItem) => [serviceItem.id, serviceItem]));
  return [
    ...serviceItems.flatMap((serviceItem) =>
      serviceItemNotificationSeeds(serviceItem, serviceOrders, vendors, equipment, today),
    ),
    ...serviceOrders.flatMap((serviceOrder) =>
      serviceOrderNotificationSeeds(serviceOrder, serviceItemById, equipment, today),
    ),
  ];
};
