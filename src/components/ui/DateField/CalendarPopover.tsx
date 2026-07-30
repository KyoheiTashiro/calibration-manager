import { ChevronDownIcon } from '@/components/icons';
import {
  buildMonthWeeks,
  dayCellClassName,
  isSameYearMonthDay,
  shiftMonth,
} from '@/components/ui/DateField/calendar';
import { addDays, daysInMonth, formatIsoDate, parseIsoDate, todayIsoDate } from '@/utils/time';
import { useCallback, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** グリッド上の矢印キーに対応する日数移動量(Partial: 対応外キーは undefined を返す) */
const DAY_STEP_BY_ARROW_KEY: Partial<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/** グリッド上の PageUp/PageDown に対応する月移動量(Partial: 対応外キーは undefined を返す) */
const MONTH_STEP_BY_PAGE_KEY: Partial<Record<string, number>> = {
  PageUp: -1,
  PageDown: 1,
};

const weekdayLabelClassName = (weekday: number): string => {
  if (weekday === 0) return 'text-red-600';
  if (weekday === 6) return 'text-primary';
  return 'text-slate-500';
};

/** 入力欄の現在値から、カレンダーを開いた瞬間のカーソル日を決める（不正・空なら今日） */
const resolveInitialCursorIso = (rawValue: string): string => {
  const parsed = parseIsoDate(rawValue);
  return parsed ? formatIsoDate(parsed) : todayIsoDate();
};

/** 月移動時、移動先の月に存在しない日（例: 1/31 の1ヶ月後）は月末日にクランプする */
const shiftCursorByMonths = (cursorIso: string, delta: number): string => {
  const parsed = parseIsoDate(cursorIso);
  if (!parsed) return cursorIso;
  const nextYearMonth = shiftMonth(parsed.year, parsed.month, delta);
  const clampedDay = Math.min(parsed.day, daysInMonth(nextYearMonth.year, nextYearMonth.month));
  return formatIsoDate({ ...nextYearMonth, day: clampedDay });
};

type Props = {
  initialValue: string;
  onSelect: (isoDate: string) => void;
  /** 閉じる。returnFocus=true でカレンダーボタンへフォーカスを戻す（Tab 押下時は false で既定の移動に任せる） */
  onClose: (returnFocus: boolean) => void;
};

export const CalendarPopover = ({ initialValue, onSelect, onClose }: Props): ReactElement => {
  const [cursorIso, setCursorIso] = useState(() => resolveInitialCursorIso(initialValue));
  const gridRef = useRef<HTMLDivElement>(null);
  const setGridRef = useCallback((node: HTMLDivElement | null) => {
    gridRef.current = node;
    node?.focus();
  }, []);

  const cursor = parseIsoDate(cursorIso) ?? { year: 1970, month: 1, day: 1 };
  const weeks = buildMonthWeeks(cursor.year, cursor.month);
  const selected = parseIsoDate(initialValue);
  const today = parseIsoDate(todayIsoDate());

  const moveCursorByDays = (delta: number): void => {
    setCursorIso((current) => addDays(current, delta) ?? current);
  };

  const moveCursorByMonths = (delta: number): void => {
    setCursorIso((current) => shiftCursorByMonths(current, delta));
  };

  const selectDay = (day: number): void => {
    onSelect(formatIsoDate({ year: cursor.year, month: cursor.month, day }));
  };

  // なぜ switch でなく Record 引き + 早期 return か: max-statements(20) 内に収めつつ、
  // 「キー→移動量」の対応をテーブルとして見渡せるようにするため。
  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const dayStep = DAY_STEP_BY_ARROW_KEY[event.key];
    if (dayStep !== undefined) {
      event.preventDefault();
      moveCursorByDays(dayStep);
      return;
    }
    const monthStep = MONTH_STEP_BY_PAGE_KEY[event.key];
    if (monthStep !== undefined) {
      event.preventDefault();
      moveCursorByMonths(monthStep);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectDay(cursor.day);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose(true);
      return;
    }
    if (event.key === 'Tab') {
      onClose(false);
    }
  };

  return (
    <>
      <div className='mb-2 flex items-center justify-between'>
        <button
          type='button'
          aria-label='前の月'
          onClick={() => {
            moveCursorByMonths(-1);
          }}
          className='flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100'
        >
          <ChevronDownIcon className='h-4 w-4 rotate-90 text-slate-500' />
        </button>
        <span aria-live='polite' className='text-sm text-slate-700'>
          {cursor.year}年{cursor.month}月
        </span>
        <button
          type='button'
          aria-label='次の月'
          onClick={() => {
            moveCursorByMonths(1);
          }}
          className='flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100'
        >
          <ChevronDownIcon className='h-4 w-4 -rotate-90 text-slate-500' />
        </button>
      </div>
      <div
        ref={setGridRef}
        role='grid'
        tabIndex={-1}
        aria-label={`${cursor.year}年${cursor.month}月`}
        onKeyDown={handleGridKeyDown}
        className='outline-none'
      >
        <table role='presentation' className='w-full table-fixed border-collapse'>
          <thead>
            <tr>
              {WEEKDAY_LABELS.map((label, weekday) => (
                <th key={label} scope='col' className={`text-xs ${weekdayLabelClassName(weekday)}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIndex) => (
              <tr key={`week-${weekIndex.toString()}`}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <td
                        key={`blank-${weekIndex.toString()}-${dayIndex.toString()}`}
                        aria-hidden
                      />
                    );
                  }
                  const isSelectedDay = isSameYearMonthDay(
                    selected,
                    cursor.year,
                    cursor.month,
                    day,
                  );
                  const isTodayDay = isSameYearMonthDay(today, cursor.year, cursor.month, day);
                  return (
                    <td key={day}>
                      <button
                        type='button'
                        aria-label={`${cursor.year}年${cursor.month}月${day}日`}
                        aria-pressed={isSelectedDay}
                        aria-current={isTodayDay ? 'date' : undefined}
                        onClick={() => {
                          selectDay(day);
                        }}
                        className={dayCellClassName(isSelectedDay, isTodayDay)}
                      >
                        {day}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='mt-2 flex justify-end'>
        <button
          type='button'
          onClick={() => {
            onSelect(todayIsoDate());
          }}
          className='text-primary text-sm hover:underline'
        >
          今日
        </button>
      </div>
    </>
  );
};
