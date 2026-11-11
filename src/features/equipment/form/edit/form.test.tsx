import { ROUTES, equipmentEditPath } from '@/constants/routes';
import { EQUIPMENT_STATUS_LABELS } from '@/features/equipment/constants';
import { EquipmentEditForm } from '@/features/equipment/form/edit';
import { EQUIPMENT_STATUS, SERVICE_ORDER_STATUS, type Equipment, type Vendor } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { toServiceItem, toServiceOrder } from '@/test/entityBuilders';
import { renderWithStore, seedStore, setupStoreIsolation } from '@/test/renderWithStore';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する。
import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

const mitutoyo: Vendor = {
  id: 'vendor-1',
  name: 'ミツトヨ',
  isManufacturer: true,
  isCalibrator: false,
};

const existingEquipment: Equipment = {
  id: 'equipment-1',
  managementNo: 'EQ-001',
  name: 'ノギス',
  model: 'CD-15',
  manufacturerId: mitutoyo.id,
  location: '検査室',
  status: EQUIPMENT_STATUS.ACTIVE,
};

const otherEquipment: Equipment = {
  id: 'equipment-2',
  managementNo: 'EQ-002',
  name: 'マイクロメータ',
  status: EQUIPMENT_STATUS.ACTIVE,
};

const DummyEquipmentDetail = (): ReactElement => {
  const { id } = useParams();
  return <p>機器詳細:{id}</p>;
};

const renderEditForm = (id: string): void => {
  renderWithStore(
    <Routes>
      <Route path={ROUTES.EQUIPMENT_EDIT} element={<EquipmentEditForm />} />
      <Route path={ROUTES.EQUIPMENT_DETAIL} element={<DummyEquipmentDetail />} />
    </Routes>,
    { initialEntries: [equipmentEditPath(id)] },
  );
};

beforeEach(setupStoreIsolation);

describe('EquipmentEditForm: 編集プリフィル・更新', () => {
  it('既存値がプリフィルされる', () => {
    seedStore({ equipment: { [existingEquipment.id]: existingEquipment } });
    renderEditForm(existingEquipment.id);

    expect(screen.getByLabelText('管理番号', { exact: false })).toHaveValue(
      existingEquipment.managementNo,
    );
    expect(screen.getByLabelText('機器名', { exact: false })).toHaveValue(existingEquipment.name);
    expect(screen.getByLabelText('型式')).toHaveValue(existingEquipment.model);
    expect(screen.getByLabelText('設置場所')).toHaveValue(existingEquipment.location);
  });

  it('値を変更して保存するとストアが更新される', async () => {
    const user = userEvent.setup();
    // manufacturerId の存在検証が保存時に走るため、参照先 Vendor も seed する
    seedStore({
      equipment: { [existingEquipment.id]: existingEquipment },
      vendors: { [mitutoyo.id]: mitutoyo },
    });
    renderEditForm(existingEquipment.id);

    const locationInput = screen.getByLabelText('設置場所');
    await user.clear(locationInput);
    await user.type(locationInput, '校正室');
    await user.click(screen.getByRole('button', { name: '保存' }));

    // 保存(react-hook-formのasync submit)後の遷移は非同期のためfindByTextで待機する
    expect(await screen.findByText(`機器詳細:${existingEquipment.id}`)).toBeInTheDocument();
    expect(useAppStore.getState().equipment[existingEquipment.id]?.location).toBe('校正室');
  });
});

describe('EquipmentEditForm: 管理番号ユニーク検証', () => {
  it('編集時に自身の管理番号を変更せず再送信してもエラーにならない', async () => {
    const user = userEvent.setup();
    // manufacturerId の存在検証が保存時に走るため、参照先 Vendor も seed する
    seedStore({
      equipment: {
        [existingEquipment.id]: existingEquipment,
        [otherEquipment.id]: otherEquipment,
      },
      vendors: { [mitutoyo.id]: mitutoyo },
    });
    renderEditForm(existingEquipment.id);

    await user.click(screen.getByRole('button', { name: '保存' }));

    // 保存(react-hook-formのasync submit)後の遷移は非同期のためfindByTextで待機する
    expect(await screen.findByText(`機器詳細:${existingEquipment.id}`)).toBeInTheDocument();
    expect(screen.queryByText('この管理番号は既に使用されています')).not.toBeInTheDocument();
    expect(useAppStore.getState().equipment[existingEquipment.id]?.managementNo).toBe(
      existingEquipment.managementNo,
    );
  });
});

describe('EquipmentEditForm: 廃棄確認ダイアログ', () => {
  it('廃棄にするボタンは表示されない', () => {
    seedStore({ equipment: { [existingEquipment.id]: existingEquipment } });
    renderEditForm(existingEquipment.id);

    expect(screen.queryByRole('button', { name: '廃棄にする' })).toBeNull();
  });

  it('status を廃棄へ変更して保存すると確認ダイアログが出て、確定で保存され詳細へ遷移する', async () => {
    const user = userEvent.setup();
    // manufacturerId の存在検証が保存時に走るため、参照先 Vendor も seed する
    seedStore({
      equipment: { [existingEquipment.id]: existingEquipment },
      vendors: { [mitutoyo.id]: mitutoyo },
    });
    renderEditForm(existingEquipment.id);

    await user.click(screen.getByRole('combobox', { name: /^状態/u }));
    await user.click(
      screen.getByRole('option', { name: EQUIPMENT_STATUS_LABELS[EQUIPMENT_STATUS.RETIRED] }),
    );
    await user.click(screen.getByRole('button', { name: '保存' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('この機器を廃棄にして保存しますか?')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '廃棄' }));

    // 確定後の遷移は非同期になり得るためfindByTextで待機する
    expect(await screen.findByText(`機器詳細:${existingEquipment.id}`)).toBeInTheDocument();
    expect(useAppStore.getState().equipment[existingEquipment.id]?.status).toBe(
      EQUIPMENT_STATUS.RETIRED,
    );
  });

  it('確認ダイアログでキャンセルすると保存されずフォームに留まる', async () => {
    const user = userEvent.setup();
    // manufacturerId の存在検証が保存時に走るため、参照先 Vendor も seed する
    seedStore({
      equipment: { [existingEquipment.id]: existingEquipment },
      vendors: { [mitutoyo.id]: mitutoyo },
    });
    renderEditForm(existingEquipment.id);

    await user.click(screen.getByRole('combobox', { name: /^状態/u }));
    await user.click(
      screen.getByRole('option', { name: EQUIPMENT_STATUS_LABELS[EQUIPMENT_STATUS.RETIRED] }),
    );
    await user.click(screen.getByRole('button', { name: '保存' }));

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'キャンセル' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useAppStore.getState().equipment[existingEquipment.id]?.status).toBe(
      EQUIPMENT_STATUS.ACTIVE,
    );
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
  });

  it('既に廃棄の機器を保存しても確認ダイアログは出ない', async () => {
    const user = userEvent.setup();
    const retiredEquipment: Equipment = {
      ...existingEquipment,
      status: EQUIPMENT_STATUS.RETIRED,
    };
    // manufacturerId の存在検証が保存時に走るため、参照先 Vendor も seed する
    seedStore({
      equipment: { [retiredEquipment.id]: retiredEquipment },
      vendors: { [mitutoyo.id]: mitutoyo },
    });
    renderEditForm(retiredEquipment.id);

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    // 保存(react-hook-formのasync submit)後の遷移は非同期のためfindByTextで待機する
    expect(await screen.findByText(`機器詳細:${retiredEquipment.id}`)).toBeInTheDocument();
  });
});

describe('EquipmentEditForm: 編集モードで存在しないid', () => {
  it('一覧画面へリダイレクトする', () => {
    render(
      <MemoryRouter initialEntries={[equipmentEditPath('does-not-exist')]}>
        <Routes>
          <Route path={ROUTES.EQUIPMENT_EDIT} element={<EquipmentEditForm />} />
          <Route path={ROUTES.EQUIPMENT_LIST} element={<div>機器一覧（テスト用マーカー）</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('機器一覧（テスト用マーカー）')).toBeInTheDocument();
  });
});

const seedWithActiveServiceOrder = (): void => {
  seedStore({
    equipment: { [existingEquipment.id]: existingEquipment },
    vendors: { [mitutoyo.id]: mitutoyo },
    serviceItems: {
      'item-1': toServiceItem({
        id: 'item-1',
        equipmentId: existingEquipment.id,
        type: 'calibration',
        name: '年次校正',
        cycle: '1Y',
        execution: 'external',
        vendorId: mitutoyo.id,
        bufferDays: 14,
        personId: 'person-1',
        noticeDaysBefore: 30,
        nextDueDate: '2026-07-31',
        isActive: true,
      }),
    },
    serviceOrders: {
      'order-1': toServiceOrder({
        id: 'order-1',
        serviceItemId: 'item-1',
        vendorId: mitutoyo.id,
        status: SERVICE_ORDER_STATUS.ORDERED,
        orderedDate: '2026-06-01',
      }),
      'order-done': toServiceOrder({
        id: 'order-done',
        serviceItemId: 'item-1',
        vendorId: mitutoyo.id,
        status: SERVICE_ORDER_STATUS.COMPLETED,
        orderedDate: '2026-05-01',
        returnedDate: '2026-05-20',
      }),
    },
  });
};

const openRetireConfirm = async (
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> => {
  renderEditForm(existingEquipment.id);
  await user.click(screen.getByRole('combobox', { name: /^状態/u }));
  await user.click(
    screen.getByRole('option', { name: EQUIPMENT_STATUS_LABELS[EQUIPMENT_STATUS.RETIRED] }),
  );
  await user.click(screen.getByRole('button', { name: '保存' }));
  return screen.getByRole('dialog');
};

describe('EquipmentEditForm: 廃棄時の進行中案件（D-109）', () => {
  it('進行中の案件数を示し、既定では案件を残したまま廃棄する', async () => {
    const user = userEvent.setup();
    seedWithActiveServiceOrder();
    const dialog = await openRetireConfirm(user);

    expect(within(dialog).getByText(/進行中の点検校正外部案件が1件あります/u)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('進行中の案件も中止する')).not.toBeChecked();

    await user.click(within(dialog).getByRole('button', { name: '廃棄' }));

    expect(await screen.findByText(`機器詳細:${existingEquipment.id}`)).toBeInTheDocument();
    expect(useAppStore.getState().equipment[existingEquipment.id]?.status).toBe(
      EQUIPMENT_STATUS.RETIRED,
    );
    expect(useAppStore.getState().serviceOrders['order-1']?.status).toBe(
      SERVICE_ORDER_STATUS.ORDERED,
    );
  });

  it('「進行中の案件も中止する」を選ぶと進行中の案件だけ中止する', async () => {
    const user = userEvent.setup();
    seedWithActiveServiceOrder();
    const dialog = await openRetireConfirm(user);

    await user.click(within(dialog).getByLabelText('進行中の案件も中止する'));
    await user.click(within(dialog).getByRole('button', { name: '廃棄' }));

    expect(await screen.findByText(`機器詳細:${existingEquipment.id}`)).toBeInTheDocument();
    expect(useAppStore.getState().serviceOrders['order-1']?.status).toBe(
      SERVICE_ORDER_STATUS.CANCELLED,
    );
    expect(useAppStore.getState().serviceOrders['order-done']?.status).toBe(
      SERVICE_ORDER_STATUS.COMPLETED,
    );
  });
});
