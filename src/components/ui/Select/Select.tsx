import { useId, type ReactElement, type Ref, type SelectHTMLAttributes } from "react";

type Props = {
  label: string;
  error?: string;
  required?: boolean;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
} & SelectHTMLAttributes<HTMLSelectElement>;

// なぜ: ui-guidelines.md §7「エラーはtext-xs text-red-600・入力枠はborder-red-500・
// フィールドとエラー文言はaria-describedbyで関連付ける」に対応する汎用セレクト。
// react-hook-formのregister()戻り値（name/onChange/onBlur/ref）をrest経由でそのまま素通しする。
export const Select = ({
  label,
  error,
  required,
  options,
  placeholder,
  ref,
  ...rest
}: Props): ReactElement => {
  const generatedId = useId();
  const selectId = rest.id ?? generatedId;
  const errorId = `${selectId}-error`;
  const hasError = error !== undefined && error !== "";

  return (
    <div>
      <label htmlFor={selectId} className="block text-sm text-slate-700">
        {label}
        {required === true && <span className="text-red-600">*</span>}
      </label>
      <select
        // oxlint-disable-next-line react/jsx-props-no-spreading -- register()のname/onChange/onBlur等を素通しするため必須
        {...rest}
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={hasError ? "true" : undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`w-full rounded border px-3 py-2 text-sm ${
          hasError ? "border-red-500" : "border-slate-300"
        }`}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasError && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
