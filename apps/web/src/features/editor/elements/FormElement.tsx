import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UiNode } from '@jjapgma/ui-spec';
import { FileUploadControl } from '../files/FileAssets';

export const formTypes = [
  'input',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'switch',
  'dateRange',
  'fileUpload',
  // legacy fallback
  'password',
  'number',
  'search',
  'multiSelect',
  'slider',
  'date',
  'time',
  'otp',
  'colorPicker',
];

const legacyInputType: Record<string, string> = {
  password: 'password',
  number: 'number',
  search: 'search',
  slider: 'range',
  date: 'date',
  time: 'time',
  fileUpload: 'file',
  colorPicker: 'color',
};

function CustomDatePickerControl({
  label,
  showLabel,
  labelPosition = 'top',
  disabled,
  isRange = true,
  withTime = true,
}: {
  label: string;
  showLabel: boolean;
  labelPosition?: 'top' | 'left' | 'right';
  disabled?: boolean;
  isRange?: boolean;
  withTime?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState({
    start: '2026-09-01',
    end: '2026-09-15',
    startTime: '00:00:00.000',
    endTime: '23:59:59.999',
  });
  const [tempStart, setTempStart] = useState<string | null>('2026-09-01');
  const [tempEnd, setTempEnd] = useState<string | null>(isRange ? '2026-09-15' : null);
  const [startTime, setStartTime] = useState({ h: '00', m: '00', s: '00', ms: '000' });
  const [endTime, setEndTime] = useState({ h: '23', m: '59', s: '59', ms: '999' });
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8, 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const formatDate = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const handleSelectDay = (day: number) => {
    const dateStr = formatDate(year, month, day);
    if (!isRange) {
      setTempStart(dateStr);
      setTempEnd(null);
      return;
    }
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (dateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  const applyRange = () => {
    if (tempStart) {
      const sTime = `${startTime.h}:${startTime.m}:${startTime.s}.${startTime.ms}`;
      const eTime = `${endTime.h}:${endTime.m}:${endTime.s}.${endTime.ms}`;
      setRange({
        start: tempStart,
        end: isRange ? (tempEnd || tempStart) : tempStart,
        startTime: sTime,
        endTime: eTime,
      });
    }
    setOpen(false);
  };

  let displayValue = '';
  if (isRange) {
    displayValue = withTime
      ? `${range.start} ${range.startTime} ~ ${range.end} ${range.endTime}`
      : `${range.start} ~ ${range.end}`;
  } else {
    displayValue = withTime ? `${range.start} ${range.startTime}` : range.start;
  }

  const isLabelRight = labelPosition === 'right';
  const labelClass = `element-field element-label-${labelPosition}`;
  const labelSpan = showLabel ? <span className="element-field-label">{label}</span> : null;
  const control = (
    <div className="element-date-range-single" onClick={() => !disabled && setOpen((v) => !v)}>
      <input
        type="text"
        readOnly
        value={displayValue}
        placeholder={isRange ? '시작일시 ~ 종료일시' : '날짜 및 시간 선택'}
        disabled={disabled}
      />
      <Calendar size={18} className="calendar-icon" />
    </div>
  );

  return (
    <div className={`element-date-range-container ${labelClass}`}>
      {isLabelRight ? (
        <>
          {control}
          {labelSpan}
        </>
      ) : (
        <>
          {labelSpan}
          {control}
        </>
      )}

      {open && (
        <div className="date-range-popover" onClick={(e) => e.stopPropagation()}>
          <div className="popover-header">
            <button
              type="button"
              className="month-nav-btn"
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              aria-label="이전 달"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="current-month-title">
              {year}년 {month + 1}월
            </span>
            <button
              type="button"
              className="month-nav-btn"
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              aria-label="다음 달"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="calendar-grid">
            <div className="weekday-header">
              {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
                <span key={i} className={i === 0 ? 'sun' : i === 6 ? 'sat' : ''}>
                  {w}
                </span>
              ))}
            </div>
            <div className="days-grid">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <span key={`empty-${i}`} className="day-empty" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                const dateStr = formatDate(year, month, d);
                const isStart = tempStart === dateStr;
                const isEnd = tempEnd === dateStr;
                const isInRange =
                  isRange && tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd;
                return (
                  <button
                    key={d}
                    type="button"
                    className={`day-btn ${isStart ? 'start-date' : ''} ${isEnd ? 'end-date' : ''} ${isInRange ? 'in-range' : ''}`}
                    onClick={() => handleSelectDay(d)}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {withTime && (
            <div className="time-picker-section">
              <span className="time-picker-label">{isRange ? '시작 시간' : '시간 (시:분:초.ms)'}</span>
              <div className="time-picker-row">
                <input
                  type="text"
                  maxLength={2}
                  value={startTime.h}
                  onChange={(e) => setStartTime((t) => ({ ...t, h: e.target.value.padStart(2, '0') }))}
                  title="시 (00~23)"
                />
                :
                <input
                  type="text"
                  maxLength={2}
                  value={startTime.m}
                  onChange={(e) => setStartTime((t) => ({ ...t, m: e.target.value.padStart(2, '0') }))}
                  title="분 (00~59)"
                />
                :
                <input
                  type="text"
                  maxLength={2}
                  value={startTime.s}
                  onChange={(e) => setStartTime((t) => ({ ...t, s: e.target.value.padStart(2, '0') }))}
                  title="초 (00~59)"
                />
                .
                <input
                  type="text"
                  maxLength={3}
                  className="time-ms-input"
                  value={startTime.ms}
                  onChange={(e) => setStartTime((t) => ({ ...t, ms: e.target.value.padStart(3, '0') }))}
                  title="밀리초 (000~999)"
                />
              </div>

              {isRange && (
                <>
                  <span className="time-picker-label" style={{ marginTop: 6 }}>
                    종료 시간 (최대 59.999초)
                  </span>
                  <div className="time-picker-row">
                    <input
                      type="text"
                      maxLength={2}
                      value={endTime.h}
                      onChange={(e) => setEndTime((t) => ({ ...t, h: e.target.value.padStart(2, '0') }))}
                      title="시 (00~23)"
                    />
                    :
                    <input
                      type="text"
                      maxLength={2}
                      value={endTime.m}
                      onChange={(e) => setEndTime((t) => ({ ...t, m: e.target.value.padStart(2, '0') }))}
                      title="분 (00~59)"
                    />
                    :
                    <input
                      type="text"
                      maxLength={2}
                      value={endTime.s}
                      onChange={(e) => setEndTime((t) => ({ ...t, s: e.target.value.padStart(2, '0') }))}
                      title="초 (00~59)"
                    />
                    .
                    <input
                      type="text"
                      maxLength={3}
                      className="time-ms-input"
                      value={endTime.ms}
                      onChange={(e) => setEndTime((t) => ({ ...t, ms: e.target.value.padStart(3, '0') }))}
                      title="밀리초 (000~999)"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="popover-footer">
            <button
              type="button"
              className="picker-sub-btn"
              onClick={() => {
                const today = formatDate(2026, 8, 15);
                setTempStart(today);
                if (isRange) setTempEnd(today);
                setEndTime({ h: '23', m: '59', s: '59', ms: '999' });
              }}
            >
              59.999초 자동설정
            </button>
            <div className="footer-actions">
              <button
                type="button"
                className="picker-cancel-btn"
                onClick={() => {
                  setTempStart(range.start);
                  setTempEnd(range.end);
                  setOpen(false);
                }}
              >
                취소
              </button>
              <button type="button" className="picker-apply-btn" onClick={applyRange}>
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FormElement({ node }: { node: UiNode }) {
  const [checked, setChecked] = useState(false);
  const label = `${node.props.text}${node.props.required ? ' *' : ''}`;
  const showLabel = node.props.labelVisible !== false;
  const labelPosition =
    node.props.labelPosition ?? (node.type === 'checkbox' ? 'right' : 'top');
  const isLabelRight = labelPosition === 'right';
  const labelClass = `element-field element-label-${labelPosition}`;
  const common = { disabled: node.props.disabled, required: node.props.required };
  const options = (node.props.items ?? '').split('\n').filter(Boolean);

  if (node.type === 'fileUpload') return <FileUploadControl node={node} />;

  const labelSpan = showLabel ? <span className="element-field-label">{label}</span> : null;

  if (node.type === 'switch') {
    const switchControl = (
      <label className="element-switch-track">
        <input
          role="switch"
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          {...common}
        />
      </label>
    );
    return (
      <div className={labelClass}>
        {isLabelRight ? (
          <>
            {switchControl}
            {labelSpan}
          </>
        ) : (
          <>
            {labelSpan}
            {switchControl}
          </>
        )}
      </div>
    );
  }

  if (node.type === 'checkbox') {
    const checkboxControl = (
      <label className="element-checkbox-box">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          {...common}
        />
      </label>
    );
    return (
      <div className={labelClass}>
        {isLabelRight ? (
          <>
            {checkboxControl}
            {labelSpan}
          </>
        ) : (
          <>
            {labelSpan}
            {checkboxControl}
          </>
        )}
      </div>
    );
  }

  if (node.type === 'radio')
    return (
      <fieldset
        className={`element-options option-${node.props.optionDirection ?? 'column'} option-align-${node.props.optionAlign ?? 'left'}`}
        disabled={common.disabled}
      >
        {showLabel && <legend>{label}</legend>}
        <div className="element-option-list">
          {options.map((option, index) => (
            <label key={index}>
              <input type="radio" name={node.id} required={common.required} />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
    );

  if (node.type === 'dateRange')
    return (
      <CustomDatePickerControl
        label={label}
        showLabel={showLabel}
        labelPosition={labelPosition}
        disabled={common.disabled}
        isRange={true}
        withTime={true}
      />
    );

  const nodeType = node.type as string;
  const type =
    node.type === 'input'
      ? (node.props.controlType ?? 'text')
      : (legacyInputType[nodeType] ?? 'text');

  if (type === 'date' || type === 'time' || nodeType === 'datePicker') {
    return (
      <CustomDatePickerControl
        label={label}
        showLabel={showLabel}
        labelPosition={labelPosition}
        disabled={common.disabled}
        isRange={false}
        withTime={type === 'time' || type === 'date'}
      />
    );
  }

  let control;
  if (nodeType === 'textarea')
    control = <textarea placeholder={node.props.placeholder} {...common} />;
  else if (nodeType === 'select' || nodeType === 'multiSelect')
    control = (
      <select multiple={Boolean(node.props.multiple || nodeType === 'multiSelect')} {...common}>
        {options.map((option, index) => (
          <option key={index}>{option}</option>
        ))}
      </select>
    );
  else {
    const type =
      node.type === 'input'
        ? (node.props.controlType ?? 'text')
        : (legacyInputType[nodeType] ?? 'text');
    const isOtp = type === 'otp' || nodeType === 'otp';
    control = (
      <input
        type={type === 'range' ? 'range' : isOtp ? 'text' : type}
        placeholder={node.props.placeholder}
        inputMode={isOtp ? 'numeric' : undefined}
        maxLength={isOtp ? 6 : undefined}
        autoComplete={isOtp ? 'one-time-code' : undefined}
        {...common}
      />
    );
  }

  return (
    <label className={labelClass}>
      {isLabelRight ? (
        <>
          {control}
          {labelSpan}
        </>
      ) : (
        <>
          {labelSpan}
          {control}
        </>
      )}
    </label>
  );
}
