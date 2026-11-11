import {
  appStateSchema,
  notificationSchema,
  serviceOrderSchema,
  serviceItemSchema,
  vendorSchema,
} from '@/store/schema';
import { describe, expect, it } from 'vitest';

const validServiceItem = {
  id: 'item-1',
  equipmentId: 'equipment-1',
  type: 'calibration',
  name: '年次校正',
  cycle: '1Y',
  execution: 'external',
  vendorId: 'vendor-1',
  bufferDays: 14,
  personId: 'person-1',
  noticeDaysBefore: 30,
  nextDueDate: '2026-07-31',
  isActive: true,
};

describe('serviceItemSchema', () => {
  it('妥当な項目を受理する', () => {
    expect(serviceItemSchema.safeParse(validServiceItem).success).toBe(true);
  });

  it('external なのに vendorId が無い項目を拒否する（相関制約）', () => {
    const { vendorId: _dropped, ...withoutVendor } = validServiceItem;
    expect(serviceItemSchema.safeParse(withoutVendor).success).toBe(false);
  });

  it('internal なら vendorId 無しでも受理する', () => {
    const { vendorId: _dropped, ...withoutVendor } = validServiceItem;
    expect(serviceItemSchema.safeParse({ ...withoutVendor, execution: 'internal' }).success).toBe(
      true,
    );
  });

  it('暦上あり得ない日付（2026-02-30）を拒否する', () => {
    expect(
      serviceItemSchema.safeParse({ ...validServiceItem, nextDueDate: '2026-02-30' }).success,
    ).toBe(false);
  });

  it('未知の cycle 値を拒否する', () => {
    expect(serviceItemSchema.safeParse({ ...validServiceItem, cycle: '4M' }).success).toBe(false);
  });

  it('負の日数（bufferDays）を拒否する', () => {
    expect(serviceItemSchema.safeParse({ ...validServiceItem, bufferDays: -1 }).success).toBe(
      false,
    );
  });
});

describe('vendorSchema', () => {
  it('必須属性のみでも受理する（任意属性は省略可）', () => {
    const minimal = {
      id: 'vendor-1',
      name: 'テスト校正',
      isManufacturer: false,
      isCalibrator: true,
    };
    expect(vendorSchema.safeParse(minimal).success).toBe(true);
  });

  it('name が空文字のレコードを拒否する', () => {
    const noName = { id: 'vendor-1', name: '', isManufacturer: false, isCalibrator: true };
    expect(vendorSchema.safeParse(noName).success).toBe(false);
  });
});

describe('serviceOrderSchema', () => {
  it('負の費用を拒否する', () => {
    const serviceOrder = {
      id: 'o-1',
      serviceItemId: 'i-1',
      vendorId: 'v-1',
      status: 'planned',
      cost: -100,
    };
    expect(serviceOrderSchema.safeParse(serviceOrder).success).toBe(false);
  });

  it('未知の status を拒否する', () => {
    const serviceOrder = { id: 'o-1', serviceItemId: 'i-1', vendorId: 'v-1', status: 'shipping' };
    expect(serviceOrderSchema.safeParse(serviceOrder).success).toBe(false);
  });
});

describe('appStateSchema', () => {
  const emptyState = {
    vendors: {},
    persons: {},
    equipment: {},
    serviceItems: {},
    serviceRecords: {},
    serviceOrders: {},
    notifications: {},
  };

  it('全テーブル空の初期状態を受理する', () => {
    expect(appStateSchema.safeParse(emptyState).success).toBe(true);
  });

  it('1レコードでも不正があれば全体パースは失敗する（merge のレコード単位サルベージが必要な根拠）', () => {
    const broken = {
      ...emptyState,
      serviceItems: { 'item-1': { ...validServiceItem, nextDueDate: '破損データ' } },
    };
    expect(appStateSchema.safeParse(broken).success).toBe(false);
  });

  it('テーブル自体が欠けている場合は失敗する', () => {
    const { notifications: _dropped, ...withoutNotifications } = emptyState;
    expect(appStateSchema.safeParse(withoutNotifications).success).toBe(false);
  });
});

const messagesOf = (result: { error?: { issues: { message: string }[] } }): string[] =>
  result.error?.issues.map((issue) => issue.message) ?? [];
describe('判別 union の相関検証（D-106）', () => {
  const order = { id: 'o-1', serviceItemId: 'i-1', vendorId: 'v-1' };

  it('内部実施の項目が依頼先・納期を持つと日本語メッセージ付きで拒否する', () => {
    const result = serviceItemSchema.safeParse({
      ...validServiceItem,
      execution: 'internal',
      leadTimeDays: 10,
    });
    expect(messagesOf(result)).toEqual([
      '内部実施の項目は校正依頼先を持てません',
      '内部実施の項目は納期を持てません',
    ]);
  });

  it('外部実施で依頼先が無い項目は日本語メッセージ付きで拒否する', () => {
    const { vendorId: _dropped, ...withoutVendor } = validServiceItem;
    expect(messagesOf(serviceItemSchema.safeParse(withoutVendor))).toEqual([
      '外部実施の項目には校正依頼先が必要です',
    ]);
  });

  it.each([
    [{ status: 'planned', orderedDate: '2026-06-01' }, '発注準備の案件は発注日を持てません'],
    [{ status: 'ordered' }, '発注済以降の案件には発注日が必要です'],
    [
      { status: 'inCalibration', orderedDate: '2026-06-01', returnedDate: '2026-06-20' },
      '返却前の案件は実返却日を持てません',
    ],
    [{ status: 'returned', orderedDate: '2026-06-01' }, '返却済以降の案件には実返却日が必要です'],
    [{ status: 'completed', orderedDate: '2026-06-01' }, '返却済以降の案件には実返却日が必要です'],
  ])('status と日付が食い違う案件 %o を拒否する', (fields, message) => {
    expect(messagesOf(serviceOrderSchema.safeParse({ ...order, ...fields }))).toEqual([message]);
  });

  it.each([
    [{ status: 'planned' }],
    [{ status: 'ordered', orderedDate: '2026-06-01' }],
    [{ status: 'returned', orderedDate: '2026-06-01', returnedDate: '2026-06-20' }],
    [{ status: 'cancelled' }],
    [{ status: 'cancelled', orderedDate: '2026-06-01', returnedDate: '2026-06-20' }],
  ])('status と日付が対応する案件 %o を受理する', (fields) => {
    expect(serviceOrderSchema.safeParse({ ...order, ...fields }).success).toBe(true);
  });

  it('対象種別と通知種別が食い違う通知を拒否する', () => {
    const notification = {
      id: 'n-1',
      targetId: 't-1',
      personId: 'p-1',
      message: '通知',
      createdDate: '2026-07-01',
      isRead: false,
    };
    expect(
      messagesOf(
        notificationSchema.safeParse({
          ...notification,
          targetType: 'serviceItem',
          type: 'deliveryOverdue',
        }),
      ),
    ).toEqual(['対象種別が点検校正項目の通知には使えない種別です']);
    expect(
      messagesOf(
        notificationSchema.safeParse({
          ...notification,
          targetType: 'serviceOrder',
          type: 'overdue',
        }),
      ),
    ).toEqual(['対象種別が点検校正外部案件の通知には使えない種別です']);
    expect(
      notificationSchema.safeParse({
        ...notification,
        targetType: 'serviceOrder',
        type: 'deliveryOverdue',
      }).success,
    ).toBe(true);
  });
});
