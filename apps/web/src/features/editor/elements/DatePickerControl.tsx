import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

type Selection = {
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  includeTime: boolean;
};
const pad = (n: number) => String(n).padStart(2, '0');
const dateText = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeValue = (time: string) => time + (time.endsWith(':59') ? ':59.999' : ':00.000');

function TimeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parts = value.split(':');
  return (
    <div className="picker-time">
      <span>{label}</span>
      <div className="picker-time-fields">
        {['시', '분'].map((unit, index) => (
          <label key={unit}>
            {unit}
            <select
              aria-label={`${label} ${unit}`}
              value={parts[index]}
              onChange={(e) => {
                const next = [...parts];
                next[index] = e.target.value;
                onChange(next.join(':'));
              }}
            >
              {Array.from({ length: index === 0 ? 24 : 60 }, (_, n) => (
                <option key={n} value={pad(n)}>
                  {pad(n)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

export function DatePickerControl({
  label,
  showLabel,
  labelPosition = 'top',
  disabled,
  isRange = false,
  timeOnly = false,
  includeTime = false,
  name,
}: {
  label: string;
  showLabel: boolean;
  labelPosition?: 'top' | 'left' | 'right';
  disabled?: boolean;
  isRange?: boolean;
  timeOnly?: boolean;
  includeTime?: boolean;
  name?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>(() => ({
    start: dateText(new Date()),
    end: dateText(new Date()),
    startTime: '00:00',
    endTime: '23:59',
    includeTime: timeOnly || includeTime,
  }));
  const [draft, setDraft] = useState(selection);
  useEffect(() => {
    setSelection((s) => ({ ...s, includeTime: timeOnly || includeTime }));
    setDraft((s) => ({ ...s, includeTime: timeOnly || includeTime }));
  }, [includeTime, timeOnly]);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [pickingEnd, setPickingEnd] = useState(false);
  const [placement, setPlacement] = useState({ left: 8, top: 8, width: 320, maxHeight: 600 });
  useEffect(() => {
    if (!open || disabled) return;
    const place = () => {
      const box = trigger.current!.getBoundingClientRect();
      const width = Math.min(320, Math.max(240, box.width), window.innerWidth - 16);
      const height = panel.current?.offsetHeight ?? 500;
      const below = window.innerHeight - box.bottom - 16;
      const top =
        below >= Math.min(height, 360) ? box.bottom + 6 : Math.max(8, box.top - height - 6);
      setPlacement({
        left: Math.max(8, Math.min(box.left, window.innerWidth - width - 8)),
        top,
        width,
        maxHeight: window.innerHeight - top - 8,
      });
    };
    const dismiss = (e: PointerEvent) => {
      if (
        e.target instanceof Node &&
        !panel.current?.contains(e.target) &&
        !trigger.current?.contains(e.target)
      )
        setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    panel.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"], button')?.focus();
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open, disabled]);
  const text = (v: Selection) => {
    if (!v.includeTime) return isRange ? v.start + ' ~ ' + v.end : v.start;
    const start = (timeOnly ? '' : v.start + ' ') + v.startTime;
    return isRange ? start + ' ~ ' + v.end + ' ' + v.endTime : start;
  };
  const invalid =
    isRange &&
    (draft.end < draft.start ||
      (draft.includeTime && draft.end === draft.start && draft.endTime < draft.startTime));
  const value = (date: string, time: string, end = false) =>
    !selection.includeTime
      ? date + (end ? 'T23:59:59.999' : 'T00:00:00.000')
      : (timeOnly ? '' : date + 'T') + timeValue(time);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const labelSpan = showLabel && <span className="element-field-label">{label}</span>;
  return (
    <div className={`element-field element-label-${labelPosition}`}>
      <input
        type="hidden"
        disabled={disabled}
        name={isRange ? (name ?? id) + '-start' : (name ?? id)}
        value={value(selection.start, selection.startTime)}
      />
      {isRange && (
        <input
          type="hidden"
          disabled={disabled}
          name={(name ?? id) + '-end'}
          value={value(selection.end, selection.endTime, true)}
        />
      )}
      {labelPosition !== 'right' && labelSpan}
      <button
        ref={trigger}
        type="button"
        className="picker-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open && !disabled}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => {
          setDraft(selection);
          setPickingEnd(false);
          const [y, m] = selection.start.split('-').map(Number);
          setMonth(new Date(y, m - 1, 1));
          setOpen(!open);
        }}
      >
        <span>{text(selection)}</span>
        <Calendar size={18} />
      </button>
      {labelPosition === 'right' && labelSpan}
      {open &&
        !disabled &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="dialog"
            aria-label={label + ' 선택'}
            className="picker-panel"
            style={placement}
          >
            {!timeOnly && (
              <>
                <div className="picker-month">
                  <button
                    type="button"
                    aria-label="이전 달"
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <strong aria-live="polite">
                    {month.getFullYear()}년 {month.getMonth() + 1}월
                  </strong>
                  <button
                    type="button"
                    aria-label="다음 달"
                    onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="picker-days">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                  {Array.from({ length: month.getDay() }, (_, n) => (
                    <span key={'empty' + n} />
                  ))}
                  {Array.from({ length: days }, (_, n) => {
                    const value = dateText(new Date(month.getFullYear(), month.getMonth(), n + 1));
                    return (
                      <button
                        type="button"
                        key={value}
                        aria-label={value}
                        aria-pressed={value === draft.start || (isRange && value === draft.end)}
                        aria-current={value === dateText(new Date()) ? 'date' : undefined}
                        data-in-range={isRange && value > draft.start && value < draft.end}
                        onClick={() => {
                          if (isRange && pickingEnd) {
                            setDraft((d) => ({
                              ...d,
                              start: value < d.start ? value : d.start,
                              end: value < d.start ? d.start : value,
                            }));
                            setPickingEnd(false);
                          } else {
                            setDraft((d) => ({ ...d, start: value, end: value }));
                            setPickingEnd(isRange);
                          }
                        }}
                      >
                        {n + 1}
                      </button>
                    );
                  })}
                </div>
                {isRange && (
                  <p className="picker-hint">
                    {pickingEnd ? '종료 날짜를 선택하세요.' : '시작 날짜를 선택하세요.'}
                  </p>
                )}
              </>
            )}
            {draft.includeTime && (
              <TimeSelect
                label={isRange ? '시작 시간' : '시간'}
                value={draft.startTime}
                onChange={(startTime) => setDraft((d) => ({ ...d, startTime }))}
              />
            )}
            {draft.includeTime && isRange && (
              <TimeSelect
                label="종료 시간"
                value={draft.endTime}
                onChange={(endTime) => setDraft((d) => ({ ...d, endTime }))}
              />
            )}
            {invalid && <p role="alert">종료 시간은 시작 시간 이후여야 합니다.</p>}
            <div className="picker-actions">
              {!timeOnly && (
                <button
                  type="button"
                  className="picker-today"
                  onClick={() => {
                    const today = new Date();
                    setDraft((d) => ({ ...d, start: dateText(today), end: dateText(today) }));
                    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                    setPickingEnd(false);
                  }}
                >
                  오늘
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                취소
              </button>
              <button
                type="button"
                disabled={invalid}
                onClick={() => {
                  setSelection(draft);
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                적용
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
