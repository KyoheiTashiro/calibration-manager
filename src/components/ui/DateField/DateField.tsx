import { CalendarIcon } from '@/components/icons';
import { CalendarPopover } from '@/components/ui/DateField/CalendarPopover';
import { setRef } from '@/components/ui/hooks/setRef';
import { useOutsideClick } from '@/components/ui/hooks/useOutsideClick';
import {
  useCallback,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactElement,
  type Ref,
} from 'react';

type Props = {
  label: string;
  error?: string;
  required?: boolean;
  ref?: Ref<HTMLInputElement>;
} & InputHTMLAttributes<HTMLInputElement>;

/**
 * なぜネイティブの value setter 経由で書き込むか: react-dom は input の value プロパティを
 * フックして最終値を追跡しており、通常の代入では直後に発火させる input イベントが
 * 「値変化なし」と判定され、React の onChange(= RHF register の購読)へ届かないため。
 * setter で直接書いてから input イベントを bubbles 付きで dispatch すると、
 * ユーザー入力と同じ経路で onChange が発火する。
 */
const nativeInputValueDescriptor = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value',
);

const setNativeInputValue = (input: HTMLInputElement, value: string): void => {
  nativeInputValueDescriptor?.set?.call(input, value);
};

export const DateField = ({ label, error, required, ref, ...rest }: Props): ReactElement => {
  const generatedId = useId();
  const inputId = rest.id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hasError = error !== undefined && error !== '';

  const [isOpen, setIsOpen] = useState(false);
  // なぜ state で保持するか: ポップオーバーを開いた瞬間の入力値をカレンダーの初期カーソルに使う。
  // render 中に ref.current を読むのは React Compiler のルール違反になるため、
  // 開くイベントハンドラの中でのみ ref を読み、その結果を state にスナップショットする。
  const [initialValueOnOpen, setInitialValueOnOpen] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // なぜ callback ref か: register() の ref（rest.ref に相当する外部 ref）と
  // カレンダー機能が内部で使う inputRef の両方に同じ DOM ノードを伝播させるため。
  const setInputRefs = useCallback(
    (node: HTMLInputElement | null): void => {
      inputRef.current = node;
      setRef(ref, node);
    },
    [ref],
  );

  const closeCalendar = (returnFocus: boolean): void => {
    setIsOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  useOutsideClick(
    wrapperRef,
    () => {
      closeCalendar(false);
    },
    isOpen,
  );

  const handleSelect = (isoDate: string): void => {
    const inputElement = inputRef.current;
    if (inputElement) {
      setNativeInputValue(inputElement, isoDate);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    closeCalendar(true);
  };

  return (
    <div>
      <label htmlFor={inputId} className='block text-sm text-slate-700'>
        {label}
        {required === true && <span className='text-red-600'>*</span>}
      </label>
      <div ref={wrapperRef} className='relative'>
        <input
          {...rest}
          ref={setInputRefs}
          id={inputId}
          required={required}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={`w-full rounded border px-3 py-2 pr-9 text-sm ${
            hasError ? 'border-red-500' : 'border-slate-300'
          }`}
          type='text'
          inputMode='numeric'
          placeholder='YYYY-MM-DD'
        />
        <button
          ref={buttonRef}
          type='button'
          aria-label='カレンダーを開く'
          aria-haspopup='dialog'
          aria-expanded={isOpen}
          disabled={rest.disabled}
          onClick={() => {
            setInitialValueOnOpen(inputRef.current?.value ?? '');
            setIsOpen((previous) => !previous);
          }}
          className='absolute top-1/2 right-2 -translate-y-1/2'
        >
          <CalendarIcon className='h-4 w-4 text-slate-400' />
        </button>
        {isOpen && (
          <dialog
            open
            aria-label='カレンダー'
            className='absolute top-full left-0 z-50 mt-1 w-72 rounded border border-slate-200 bg-white p-3 shadow-lg'
          >
            <CalendarPopover
              initialValue={initialValueOnOpen}
              onSelect={handleSelect}
              onClose={closeCalendar}
            />
          </dialog>
        )}
      </div>
      {hasError && (
        <p id={errorId} className='text-xs text-red-600'>
          {error}
        </p>
      )}
    </div>
  );
};
