import { useOutsideClick } from '@/components/ui/hooks/useOutsideClick';
import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react';

export type SelectOption = {
  value: string;
  label: string;
};

type UseSelectBehaviorArgs = {
  options: readonly SelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

type UseSelectBehaviorResult = {
  isOpen: boolean;
  focusedIndex: number;
  wrapperRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  setListboxRef: (node: HTMLDivElement | null) => void;
  setFocusedIndex: Dispatch<SetStateAction<number>>;
  handleTriggerClick: () => void;
  handleTriggerKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  handleListKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  selectByIndex: (index: number) => void;
};

// なぜ別ファイルか: Select.tsx を oxlint max-lines(300) 内に収めるため、
// 開閉状態・フォーカス管理・キーボード操作ロジック(表示に依存しない部分)を分離する。
// なぜ triggerRef のマージ(RHF field.ref 等の外部 ref との合流)はここに含めないか:
// react-compiler が「hook 引数(props由来の外部ref)の変更」と誤検知するため、
// DateField.tsx の setInputRefs と同様に Select コンポーネント本体側で行う。
export const useSelectBehavior = ({
  options,
  value,
  onChange,
  onBlur,
}: UseSelectBehaviorArgs): UseSelectBehaviorResult => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);

  useOutsideClick(
    wrapperRef,
    () => {
      setIsOpen(false);
      onBlur?.();
    },
    isOpen,
  );

  const setListboxRef = useCallback((node: HTMLDivElement | null) => {
    node?.focus();
  }, []);

  const open = (): void => {
    setFocusedIndex(Math.max(selectedIndex, 0));
    setIsOpen(true);
  };

  const close = (returnFocus: boolean, shouldBlur: boolean): void => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
    if (shouldBlur) onBlur?.();
  };

  const selectByIndex = (index: number): void => {
    const option = options.at(index);
    if (option !== undefined) onChange(option.value);
    close(true, true);
  };

  const moveFocusBy = (delta: number): void => {
    setFocusedIndex((previousIndex) =>
      Math.min(Math.max(previousIndex + delta, 0), options.length - 1),
    );
  };

  const handleTriggerClick = (): void => {
    if (isOpen) {
      close(false, false);
    } else {
      open();
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (
      event.key !== 'Enter' &&
      event.key !== ' ' &&
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp'
    ) {
      return;
    }
    event.preventDefault();
    open();
  };

  const keyActions: Partial<Record<string, () => void>> = {
    ArrowDown: () => {
      moveFocusBy(1);
    },
    ArrowUp: () => {
      moveFocusBy(-1);
    },
    Home: () => {
      setFocusedIndex(0);
    },
    End: () => {
      setFocusedIndex(options.length - 1);
    },
    Enter: () => {
      selectByIndex(focusedIndex);
    },
    ' ': () => {
      selectByIndex(focusedIndex);
    },
    Escape: () => {
      close(true, true);
    },
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Tab') {
      close(false, true);
      return;
    }
    const action: (() => void) | undefined = keyActions[event.key];
    if (action === undefined) return;
    event.preventDefault();
    action();
  };

  return {
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
  };
};
