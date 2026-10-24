import { useId, type InputHTMLAttributes, type ReactElement, type Ref } from 'react';

type Props = {
  label: string;
  ref?: Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>;

// なぜ: チェックボックスはラベルを右横に置くレイアウトが必要で、TextField の
// 上ラベル構造と異なるため別コンポーネントにする。
export const Checkbox = ({ label, ref, ...rest }: Props): ReactElement => {
  const generatedId = useId();
  const inputId = rest.id ?? generatedId;

  return (
    <div>
      <label htmlFor={inputId} className='flex items-center gap-2 text-sm text-slate-700'>
        <input
          type='checkbox'
          {...rest}
          ref={ref}
          id={inputId}
          className='h-4 w-4 rounded border-slate-300'
        />
        {label}
      </label>
    </div>
  );
};
