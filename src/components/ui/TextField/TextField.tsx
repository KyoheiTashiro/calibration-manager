import { useId, type InputHTMLAttributes, type ReactElement, type Ref } from "react";

type Props = {
  label: string;
  error?: string;
  required?: boolean;
  ref?: Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>;

// なぜ: ui-guidelines.md §7 のラベル・必須マーク・エラー表示パターンを Select / DateField と
// 統一した汎用テキスト入力。type はrest素通しなので "number" 等にも使える。
export const TextField = ({ label, error, required, ref, ...rest }: Props): ReactElement => {
  const generatedId = useId();
  const inputId = rest.id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hasError = error !== undefined && error !== "";

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm text-slate-700">
        {label}
        {required === true && <span className="text-red-600">*</span>}
      </label>
      <input
        type="text"
        // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
        {...rest}
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={hasError ? "true" : undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`w-full rounded border px-3 py-2 text-sm ${
          hasError ? "border-red-500" : "border-slate-300"
        }`}
      />
      {hasError && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
