import { Select } from '@/components/ui/Select/Select';
import type { ComponentProps, ReactElement } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

type Props<FormValues extends FieldValues> = {
  control: Control<FormValues>;
  name: FieldPath<FormValues>;
} & Omit<ComponentProps<typeof Select>, 'value' | 'onChange' | 'onBlur' | 'ref' | 'name'>;

export const ControlledSelect = <FormValues extends FieldValues>({
  control,
  name,
  ...selectProps
}: Props<FormValues>): ReactElement => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <Select
        {...selectProps}
        // なぜ: field.value は RHF 側で undefined を取り得るため（vendorId/manufacturerId 等の
        // optional field）、Select の value: string 契約に合わせて "" に正規化する。
        value={typeof field.value === 'string' ? field.value : ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        ref={field.ref}
        name={field.name}
      />
    )}
  />
);
