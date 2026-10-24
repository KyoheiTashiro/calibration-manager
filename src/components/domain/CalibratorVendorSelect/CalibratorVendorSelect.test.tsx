import { CalibratorVendorSelect } from '@/components/domain/CalibratorVendorSelect';
import type { Vendor } from '@/store/types';
import { renderWithStore, seedStore, setupStoreIsolation } from '@/test/renderWithStore';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(setupStoreIsolation);

const calibratorVendor: Vendor = {
  id: 'vendor-1',
  name: 'ミツトヨ校正センター',
  isManufacturer: false,
  isCalibrator: true,
};

const manufacturerOnlyVendor: Vendor = {
  id: 'vendor-2',
  name: 'メーカーのみ商事',
  isManufacturer: true,
  isCalibrator: false,
};

const Harness = ({ error }: { error?: string }): ReactElement => {
  const { control } = useForm<{ vendorId: string }>({ defaultValues: { vendorId: '' } });
  return <CalibratorVendorSelect control={control} name='vendorId' error={error} />;
};

describe('CalibratorVendorSelect', () => {
  it('校正業者のみを選択肢に出す', async () => {
    const user = userEvent.setup();
    seedStore({
      vendors: {
        [calibratorVendor.id]: calibratorVendor,
        [manufacturerOnlyVendor.id]: manufacturerOnlyVendor,
      },
    });
    renderWithStore(<Harness />);

    await user.click(screen.getByRole('combobox', { name: /校正依頼先/u }));

    expect(screen.getByRole('option', { name: 'ミツトヨ校正センター' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'メーカーのみ商事' })).not.toBeInTheDocument();
  });

  it('error を渡すとエラーメッセージを表示する', () => {
    seedStore({ vendors: { [calibratorVendor.id]: calibratorVendor } });
    renderWithStore(<Harness error='校正依頼先を選択してください' />);

    expect(screen.getByText('校正依頼先を選択してください')).toBeInTheDocument();
  });

  it('校正業者が未登録ならセレクトの代わりにメーカー/取引先一覧への導線を出す', () => {
    seedStore({ vendors: { [manufacturerOnlyVendor.id]: manufacturerOnlyVendor } });
    renderWithStore(<Harness />);

    expect(screen.getByText(/校正業者が未登録です/u)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'メーカー/取引先一覧へ' })).toHaveAttribute(
      'href',
      '/vendors',
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
