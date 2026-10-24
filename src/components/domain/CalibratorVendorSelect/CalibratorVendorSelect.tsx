import { ControlledSelect } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useAppStore } from '@/store/useAppStore';
import type { ReactElement } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Link } from 'react-router-dom';

type Props<FormValues extends FieldValues> = {
  control: Control<FormValues>;
  name: FieldPath<FormValues>;
  error?: string;
};

/**
 * 校正依頼先(校正業者)の必須セレクト。ServiceItemModal / ServiceOrderModal で共用する。
 * 校正業者が 1 件もなければセレクトの代わりにメーカー/取引先一覧への導線を出す。
 */
export const CalibratorVendorSelect = <FormValues extends FieldValues>({
  control,
  name,
  error,
}: Props<FormValues>): ReactElement => {
  const vendors = useAppStore((state) => state.vendors);
  const vendorOptions = Object.values(vendors)
    .filter((vendor) => vendor.isCalibrator)
    .map((vendor) => ({ value: vendor.id, label: vendor.name }));

  if (vendorOptions.length === 0) {
    return (
      <div>
        <span className='block text-sm text-slate-700'>
          校正依頼先<span className='text-red-600'>*</span>
        </span>
        <p className='text-sm text-slate-600'>
          校正業者が未登録です
          <Link to={ROUTES.VENDOR_LIST} className='text-primary ml-1 underline'>
            メーカー/取引先一覧へ
          </Link>
        </p>
      </div>
    );
  }

  return (
    <ControlledSelect
      control={control}
      name={name}
      label='校正依頼先'
      required
      placeholder='選択してください'
      options={vendorOptions}
      error={error}
    />
  );
};
