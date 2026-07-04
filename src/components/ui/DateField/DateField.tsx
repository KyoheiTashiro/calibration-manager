import { useId, type InputHTMLAttributes, type ReactElement, type Ref } from "react";

type Props = {
  label: string;
  error?: string;
  required?: boolean;
  ref?: Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>;

// なぜ: ui-guidelines.md §7・§9「日付はYYYY-MM-DD文字列」に対応する<input type="date">ラッパー。
// Selectと同じラベル・必須マーク・エラー表示パターンで統一する。
export const DateField = ({ label, error, required, ref, ...rest }: Props): ReactElement => {
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
        {...rest}
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={hasError ? "true" : undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`w-full rounded border px-3 py-2 text-sm ${
          hasError ? "border-red-500" : "border-slate-300"
        }`}
        type="date"
      />
      {hasError && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
