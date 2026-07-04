import { useId, type ReactElement, type Ref, type TextareaHTMLAttributes } from "react";

type Props = {
  label: string;
  error?: string;
  required?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

// なぜ: ui-guidelines.md §7 のラベル・必須マーク・エラー表示パターンを TextField / Select と
// 統一した汎用複数行テキスト入力。
export const Textarea = ({ label, error, required, ref, ...rest }: Props): ReactElement => {
  const generatedId = useId();
  const textareaId = rest.id ?? generatedId;
  const errorId = `${textareaId}-error`;
  const hasError = error !== undefined && error !== "";

  return (
    <div>
      <label htmlFor={textareaId} className="block text-sm text-slate-700">
        {label}
        {required === true && <span className="text-red-600">*</span>}
      </label>
      <textarea
        {...rest}
        ref={ref}
        id={textareaId}
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
