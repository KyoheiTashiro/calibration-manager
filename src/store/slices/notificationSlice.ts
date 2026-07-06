/**
 * 発生条件判定は domain/notificationRules.ts（純粋関数）に委譲し、本スライスは
 * 対象の絞り込み・重複抑止・id/日付付与のみを担う。
 */

import { computeExpectedNotifications, type NotificationSeed } from "@/domain/notificationRules";
import type { AppSliceCreator } from "@/store/storeState";
import { EQUIPMENT_STATUS, type IsoDateString, type Notification } from "@/store/types";
import { createId } from "@/utils/id";
import { recordValue } from "@/utils/record";

const duplicationKey = (seed: Pick<NotificationSeed, "targetType" | "targetId" | "type">): string =>
  `${seed.targetType}:${seed.targetId}:${seed.type}`;

export type NotificationSlice = {
  notifications: Record<string, Notification>;
  /**
   * 有効な項目（serviceItem.isActive かつ 紐づく機器が active）と全案件をスキャンし、
   * 発生条件を満たす通知を生成する。同一（targetType, targetId, type）の未読通知が
   * 既に存在する場合は生成をスキップする。
   */
  generateNotifications: (today: IsoDateString) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

export const createNotificationSlice: AppSliceCreator<NotificationSlice> = (set, get) => ({
  notifications: {},

  generateNotifications: (today): void => {
    const { serviceItems, serviceOrders, vendors, equipment, notifications } = get();
    const targetServiceItems = Object.values(serviceItems).filter(
      (serviceItem) =>
        serviceItem.isActive &&
        recordValue(equipment, serviceItem.equipmentId)?.status === EQUIPMENT_STATUS.ACTIVE,
    );
    const seeds = computeExpectedNotifications(
      targetServiceItems,
      Object.values(serviceOrders),
      vendors,
      equipment,
      today,
    );
    const unreadKeys = new Set(
      Object.values(notifications)
        .filter((notification) => !notification.isRead)
        .map((notification) => duplicationKey(notification)),
    );
    const freshSeeds = seeds.filter((seed) => !unreadKeys.has(duplicationKey(seed)));
    if (freshSeeds.length === 0) return;

    set((state) => {
      for (const seed of freshSeeds) {
        const id = createId();
        state.notifications[id] = { ...seed, id, createdDate: today, isRead: false };
      }
    });
  },

  markAsRead: (id): void => {
    set((state) => {
      const notification = recordValue(state.notifications, id);
      if (notification === undefined) return;
      notification.isRead = true;
    });
  },

  markAllAsRead: (): void => {
    set((state) => {
      for (const notification of Object.values(state.notifications)) {
        notification.isRead = true;
      }
    });
  },
});
