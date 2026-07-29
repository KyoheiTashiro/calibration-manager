import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { setRef } from "@/components/ui/hooks/setRef";
import { useSelectBehavior, type SelectOption } from "@/components/ui/Select/useSelectBehavior";
import { useCallback, useId, type ReactElement, type Ref } from "react";

type Props = {
  label: string;
  labelHidden?: boolean;
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onBlur?: () => void;
  ref?: Ref<HTMLButtonElement>;
};

export const Select = ({
  label,
  labelHidden = false,
  options,
  value,
  onChange,
  error,
  required,
  placeholder,
  disabled = false,
  id,
  name,
  onBlur,
  ref,
}: Props): ReactElement => {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const labelId = `${selectId}-label`;
  const listboxId = `${selectId}-listbox`;
  const errorId = `${selectId}-error`;
  const hasError = error !== undefined && error !== "";
  const allOptions =
    placeholder === undefined ? options : [{ value: "", label: placeholder }, ...options];
  const selectedOption = allOptions.find((option) => option.value === value);
  const {
    isOpen,
    focusedIndex,
    wrapperRef,
    triggerRef,
    setListboxRef,
    setFocusedIndex,
    handleTriggerClick,
    handleTriggerKeyDown,
    handleListKeyDown,
    selectByIndex,
  } = useSelectBehavior({ options: allOptions, value, onChange, onBlur });

  // なぜ: register()/RHF field.ref に相当する外部 ref と、フォーカス管理用の内部 triggerRef の
  // 両方に同じ DOM ノードを伝播させる（DateField.tsx の setInputRefs と同じ理由・同じ形）。
  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null): void => {
      triggerRef.current = node;
      setRef(ref, node);
    },
    [ref, triggerRef],
  );

  return (
    <div>
      <label id={labelId} className={labelHidden ? "sr-only" : "block text-sm text-slate-700"}>
        {label}
        {required === true && <span className="text-red-600">*</span>}
      </label>
      <div ref={wrapperRef} className="relative">
        <button
          ref={setTriggerRef}
          type="button"
          id={selectId}
          name={name}
          disabled={disabled}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- リッチUI化(アイコン付きoption等)のためネイティブ select ではなく ARIA 1.2 select-only combobox パターンで自前実装する方針(このタスクの要件)
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-labelledby={labelId}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={hasError ? errorId : undefined}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
          className={`flex w-full items-center justify-between gap-2 rounded border bg-white px-3 py-2 text-left text-sm disabled:opacity-50 ${
            hasError ? "border-red-500" : "border-slate-300"
          }`}
        >
          {/* 未選択(value="")時は placeholder 表示扱いとしてグレー文字にする(実 option 選択時のみ通常色) */}
          <span
            className={
              selectedOption === undefined || selectedOption.value === ""
                ? "text-slate-400"
                : undefined
            }
          >
            {selectedOption?.label ?? placeholder ?? ""}
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {isOpen && (
          <div
            ref={setListboxRef}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- 上記combobox同様の理由
            role="listbox"
            id={listboxId}
            aria-labelledby={labelId}
            aria-activedescendant={
              focusedIndex >= 0 ? `${selectId}-option-${focusedIndex.toString()}` : undefined
            }
            tabIndex={-1}
            onKeyDown={handleListKeyDown}
            className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded border border-slate-200 bg-white py-1 shadow-lg"
          >
            {allOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isFocused = index === focusedIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  ref={isFocused ? (node) => node?.scrollIntoView({ block: "nearest" }) : undefined}
                  id={`${selectId}-option-${index.toString()}`}
                  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- 上記combobox同様の理由
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onClick={() => {
                    selectByIndex(index);
                  }}
                  onMouseEnter={() => {
                    setFocusedIndex(index);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    isSelected ? "text-primary font-medium" : ""
                  } ${isFocused ? "bg-slate-100" : ""}`}
                >
                  {option.label}
                  {isSelected && <CheckIcon className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {hasError && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
