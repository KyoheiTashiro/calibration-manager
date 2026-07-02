import {
  canTransitionOrderStatus,
  isActiveOrderStatus,
  ORDER_STATUS_TRANSITIONS,
} from "@/domain/orderStatus";
import { ORDER_STATUS, type OrderStatus } from "@/store/types";
import { describe, expect, it } from "vitest";

const ALL_STATUSES: OrderStatus[] = Object.values(ORDER_STATUS);

describe("canTransitionOrderStatus（domain-model.md §3.6 の状態遷移）", () => {
  it("正常系の隣接遷移をすべて許可する", () => {
    expect(canTransitionOrderStatus(ORDER_STATUS.PLANNED, ORDER_STATUS.ORDERED)).toBe(true);
    expect(canTransitionOrderStatus(ORDER_STATUS.ORDERED, ORDER_STATUS.IN_CALIBRATION)).toBe(true);
    expect(canTransitionOrderStatus(ORDER_STATUS.IN_CALIBRATION, ORDER_STATUS.RETURNED)).toBe(true);
    expect(canTransitionOrderStatus(ORDER_STATUS.RETURNED, ORDER_STATUS.COMPLETED)).toBe(true);
  });

  it("planned〜returned の各段階から cancelled へ遷移できる", () => {
    expect(canTransitionOrderStatus(ORDER_STATUS.PLANNED, ORDER_STATUS.CANCELLED)).toBe(true);
    expect(canTransitionOrderStatus(ORDER_STATUS.ORDERED, ORDER_STATUS.CANCELLED)).toBe(true);
    expect(canTransitionOrderStatus(ORDER_STATUS.IN_CALIBRATION, ORDER_STATUS.CANCELLED)).toBe(
      true,
    );
    expect(canTransitionOrderStatus(ORDER_STATUS.RETURNED, ORDER_STATUS.CANCELLED)).toBe(true);
  });

  it("飛び越し遷移は許可しない（screen-design/08-orders.md「隣接遷移のみ」）", () => {
    expect(canTransitionOrderStatus(ORDER_STATUS.PLANNED, ORDER_STATUS.IN_CALIBRATION)).toBe(false);
    expect(canTransitionOrderStatus(ORDER_STATUS.PLANNED, ORDER_STATUS.COMPLETED)).toBe(false);
    expect(canTransitionOrderStatus(ORDER_STATUS.ORDERED, ORDER_STATUS.RETURNED)).toBe(false);
    expect(canTransitionOrderStatus(ORDER_STATUS.ORDERED, ORDER_STATUS.COMPLETED)).toBe(false);
    expect(canTransitionOrderStatus(ORDER_STATUS.IN_CALIBRATION, ORDER_STATUS.COMPLETED)).toBe(
      false,
    );
  });

  it("逆行遷移は許可しない", () => {
    expect(canTransitionOrderStatus(ORDER_STATUS.ORDERED, ORDER_STATUS.PLANNED)).toBe(false);
    expect(canTransitionOrderStatus(ORDER_STATUS.IN_CALIBRATION, ORDER_STATUS.ORDERED)).toBe(false);
    expect(canTransitionOrderStatus(ORDER_STATUS.RETURNED, ORDER_STATUS.IN_CALIBRATION)).toBe(
      false,
    );
  });

  it("completed / cancelled は終端でありどこへも遷移できない", () => {
    for (const target of ALL_STATUSES) {
      expect(canTransitionOrderStatus(ORDER_STATUS.COMPLETED, target)).toBe(false);
      expect(canTransitionOrderStatus(ORDER_STATUS.CANCELLED, target)).toBe(false);
    }
  });

  it("自分自身への遷移は許可しない", () => {
    for (const status of ALL_STATUSES) {
      expect(canTransitionOrderStatus(status, status)).toBe(false);
    }
  });

  it("遷移テーブルは全6状態を起点として網羅している", () => {
    expect(Object.keys(ORDER_STATUS_TRANSITIONS).toSorted()).toEqual(ALL_STATUSES.toSorted());
  });
});

describe("isActiveOrderStatus", () => {
  it("planned / ordered / inCalibration / returned は有効な案件", () => {
    expect(isActiveOrderStatus(ORDER_STATUS.PLANNED)).toBe(true);
    expect(isActiveOrderStatus(ORDER_STATUS.ORDERED)).toBe(true);
    expect(isActiveOrderStatus(ORDER_STATUS.IN_CALIBRATION)).toBe(true);
    expect(isActiveOrderStatus(ORDER_STATUS.RETURNED)).toBe(true);
  });

  it("completed / cancelled は有効な案件ではない", () => {
    expect(isActiveOrderStatus(ORDER_STATUS.COMPLETED)).toBe(false);
    expect(isActiveOrderStatus(ORDER_STATUS.CANCELLED)).toBe(false);
  });
});
