import {
  canTransitionServiceOrderStatus,
  isActiveServiceOrderStatus,
  SERVICE_ORDER_STATUS_TRANSITIONS,
} from "@/domain/serviceOrderStatus";
import { SERVICE_ORDER_STATUS, type ServiceOrderStatus } from "@/store/types";
import { describe, expect, it } from "vitest";

const ALL_STATUSES: ServiceOrderStatus[] = Object.values(SERVICE_ORDER_STATUS);

describe("canTransitionServiceOrderStatus（domain-model.md §3.6 の状態遷移）", () => {
  it("正常系の隣接遷移をすべて許可する", () => {
    expect(
      canTransitionServiceOrderStatus(SERVICE_ORDER_STATUS.PLANNED, SERVICE_ORDER_STATUS.ORDERED),
    ).toBe(true);
    expect(
      canTransitionServiceOrderStatus(
        SERVICE_ORDER_STATUS.ORDERED,
        SERVICE_ORDER_STATUS.IN_CALIBRATION,
      ),
    ).toBe(true);
    expect(
      canTransitionServiceOrderStatus(
        SERVICE_ORDER_STATUS.IN_CALIBRATION,
        SERVICE_ORDER_STATUS.RETURNED,
      ),
    ).toBe(true);
    expect(
      canTransitionServiceOrderStatus(
        SERVICE_ORDER_STATUS.RETURNED,
        SERVICE_ORDER_STATUS.COMPLETED,
      ),
    ).toBe(true);
  });

  it("planned〜returned の各段階から cancelled へ遷移できる", () => {
    expect(
      canTransitionServiceOrderStatus(SERVICE_ORDER_STATUS.PLANNED, SERVICE_ORDER_STATUS.CANCELLED),
    ).toBe(true);
    expect(
      canTransitionServiceOrderStatus(SERVICE_ORDER_STATUS.ORDERED, SERVICE_ORDER_STATUS.CANCELLED),
    ).toBe(true);
    expect(
      canTransitionServiceOrderStatus(
        SERVICE_ORDER_STATUS.IN_CALIBRATION,
        SERVICE_ORDER_STATUS.CANCELLED,
      ),
    ).toBe(true);
    expect(
      canTransitionServiceOrderStatus(
        SERVICE_ORDER_STATUS.RETURNED,
        SERVICE_ORDER_STATUS.CANCELLED,
      ),
    ).toBe(true);
  });

  it("飛び越し遷移は許可しない（screen-design/08-service-orders.md「隣接遷移のみ」）", () => {
    expect(
      canTransitionServiceOrderStatus(
        SERVICE_ORDER_STATUS.PLANNED,
        SERVICE_ORDER_STATUS.IN_CALIBRATION,
      ),
    ).toBe(false);
    expect(
      canTransitionServiceOrderStatus(SERVICE_ORDER_STATUS.PLANNED, SERVICE_ORDER_STATUS.COMPLETED),
    ).toBe(false);
    expect(
      canTransitionServiceOrderStatus(SERVICE_ORDER_STATUS.ORDERED, SERVICE_ORDER_STATUS.RETURNED),
    ).toBe(false);
    expect(
      canTransitionServiceOrderStatus(SERVICE_ORDER_STATUS.ORDERED, SERVICE_ORDER_STATUS.COMPLETED),
    ).toBe(false);
    expect(
      canTransitionServiceOrderStatus(
        SERVICE_ORDER_STATUS.IN_CALIBRATION,
        SERVICE_ORDER_STATUS.COMPLETED,
      ),
    ).toBe(false);
  });

  it("逆行遷移は許可しない", () => {
    expect(
      canTransitionServiceOrderStatus(SERVICE_ORDER_STATUS.ORDERED, SERVICE_ORDER_STATUS.PLANNED),
    ).toBe(false);
    expect(
      canTransitionServiceOrderStatus(
        SERVICE_ORDER_STATUS.IN_CALIBRATION,
        SERVICE_ORDER_STATUS.ORDERED,
      ),
    ).toBe(false);
    expect(
      canTransitionServiceOrderStatus(
        SERVICE_ORDER_STATUS.RETURNED,
        SERVICE_ORDER_STATUS.IN_CALIBRATION,
      ),
    ).toBe(false);
  });

  it("completed / cancelled は終端でありどこへも遷移できない", () => {
    for (const target of ALL_STATUSES) {
      expect(canTransitionServiceOrderStatus(SERVICE_ORDER_STATUS.COMPLETED, target)).toBe(false);
      expect(canTransitionServiceOrderStatus(SERVICE_ORDER_STATUS.CANCELLED, target)).toBe(false);
    }
  });

  it("自分自身への遷移は許可しない", () => {
    for (const status of ALL_STATUSES) {
      expect(canTransitionServiceOrderStatus(status, status)).toBe(false);
    }
  });

  it("遷移テーブルは全6状態を起点として網羅している", () => {
    expect(Object.keys(SERVICE_ORDER_STATUS_TRANSITIONS).toSorted()).toEqual(
      ALL_STATUSES.toSorted(),
    );
  });
});

describe("isActiveServiceOrderStatus", () => {
  it("planned / ordered / inCalibration / returned は有効な案件", () => {
    expect(isActiveServiceOrderStatus(SERVICE_ORDER_STATUS.PLANNED)).toBe(true);
    expect(isActiveServiceOrderStatus(SERVICE_ORDER_STATUS.ORDERED)).toBe(true);
    expect(isActiveServiceOrderStatus(SERVICE_ORDER_STATUS.IN_CALIBRATION)).toBe(true);
    expect(isActiveServiceOrderStatus(SERVICE_ORDER_STATUS.RETURNED)).toBe(true);
  });

  it("completed / cancelled は有効な案件ではない", () => {
    expect(isActiveServiceOrderStatus(SERVICE_ORDER_STATUS.COMPLETED)).toBe(false);
    expect(isActiveServiceOrderStatus(SERVICE_ORDER_STATUS.CANCELLED)).toBe(false);
  });
});
