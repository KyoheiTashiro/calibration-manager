import { useId, type InputHTMLAttributes, type ReactElement, type Ref } from "react";

type Props = {
  label: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>;

// なぜ: チェックボックスはラベルを右横に置くレイアウトが必要で、TextField の
// 上ラベル構造と異なるため別コンポーネントにする。register()素通しは他と同じ。
export const Checkbox = ({ label, error, ref, ...rest }: Props): ReactElement => {
  const generatedId = useId();
  const inputId = rest.id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hasError = error !== undefined && error !== "";

  return (
    <div>
      <label htmlFor={inputId} className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          {...rest}
          ref={ref}
          id={inputId}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={hasError ? errorId : undefined}
          className="h-4 w-4 rounded border-slate-300"
        />
        {label}
      </label>
      {hasError && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
