import { useId, type InputHTMLAttributes, type ReactElement, type Ref } from "react";

type Props = {
  label: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  required?: boolean;
  ref?: Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>;

// なぜ: ラジオ群は fieldset/legend でグループ名を与える構造が必要で、単一 input の
// TextField / Select と DOM 構造が異なるため別コンポーネントにする。
// register() の戻り値を全ラジオへ素通しし、value だけ選択肢ごとに固定する
// (react-hook-form は同名 radio 群の複数 ref を束ねて扱える)。
export const RadioGroup = ({
  label,
  options,
  error,
  required,
  ref,
  ...rest
}: Props): ReactElement => {
  const groupId = useId();
  const errorId = `${groupId}-error`;
  const hasError = error !== undefined && error !== "";

  return (
    <fieldset
      aria-describedby={hasError ? errorId : undefined}
      aria-invalid={hasError ? "true" : undefined}
    >
      <legend className="block text-sm text-slate-700">
        {label}
        {required === true && <span className="text-red-600">*</span>}
      </legend>
      <div className="flex items-center gap-4">
        {options.map((option) => {
          const inputId = `${groupId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className="flex items-center gap-2 text-sm text-slate-700"
            >
              <input
                type="radio"
                {...rest}
                ref={ref}
                id={inputId}
                value={option.value}
                className="h-4 w-4 border-slate-300"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {hasError && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
};
