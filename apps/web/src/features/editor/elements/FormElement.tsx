import { useState, useId } from 'react';
import { DatePickerControl } from './DatePickerControl';
import type { UiNode } from '@jjapgma/ui-spec';
import { FileUploadControl } from '../files/FileAssets';
import { useNavigation } from '../NavigationRuntime';

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

export function FormElement({ node }: { node: UiNode }) {
  const [checked, setChecked] = useState(false);
  const [value, setLocalValue] = useState('');
  const { search } = useNavigation();
  const setValue = (next: string) => {
    setLocalValue(next);
    if (node.type === 'input' && node.props.controlType === 'search' && node.props.searchTargetId)
      search(node.props.searchTargetId, next);
  };
  const messageId = useId();
  const label = `${node.props.text}${node.props.required ? ' *' : ''}`;
  const showLabel = node.props.labelVisible !== false;
  const labelPosition = node.props.labelPosition ?? (node.type === 'checkbox' ? 'right' : 'top');
  const isLabelRight = labelPosition === 'right';
  const labelClass = `element-field element-label-${labelPosition}`;
  const common = {
    disabled: node.props.disabled,
    required: node.props.required,
    'aria-label': label,
    'aria-invalid': node.props.errorText ? true : undefined,
    'aria-describedby': node.props.errorText || node.props.description ? messageId : undefined,
  };
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
      <div
        role="group"
        aria-label={label}
        className={`element-options ${labelClass} option-${node.props.optionDirection ?? 'column'} option-align-${node.props.optionAlign ?? 'left'}`}
      >
        {!isLabelRight && labelSpan}
        <div className="element-option-list">
          {options.map((option, index) => (
            <label key={index}>
              <input
                type="radio"
                name={node.id}
                disabled={common.disabled}
                required={common.required}
              />
              {option}
            </label>
          ))}
        </div>
        {isLabelRight && labelSpan}
      </div>
    );

  if (node.type === 'dateRange')
    return (
      <DatePickerControl
        label={label}
        showLabel={showLabel}
        labelPosition={labelPosition}
        disabled={common.disabled}
        isRange={true}
        includeTime={node.props.includeTime ?? false}
        name={node.id}
      />
    );

  const nodeType = node.type as string;
  const type =
    node.type === 'input'
      ? (node.props.controlType ?? 'text')
      : (legacyInputType[nodeType] ?? 'text');

  if (
    type === 'date' ||
    type === 'time' ||
    type === 'datetime-local' ||
    nodeType === 'datePicker'
  ) {
    return (
      <DatePickerControl
        label={label}
        showLabel={showLabel}
        labelPosition={labelPosition}
        disabled={common.disabled}
        isRange={false}
        timeOnly={type === 'time'}
        includeTime={node.props.includeTime ?? (type === 'time' || type === 'datetime-local')}
        name={node.id}
      />
    );
  }

  let control;
  if (nodeType === 'textarea')
    control = (
      <textarea id={`${messageId}-control`} placeholder={node.props.placeholder} {...common} />
    );
  else if (nodeType === 'select' || nodeType === 'multiSelect')
    control = (
      <select
        className={node.props.multiple ? '' : 'field-control'}
        data-field-control={node.props.multiple ? undefined : true}
        id={`${messageId}-control`}
        multiple={Boolean(node.props.multiple || nodeType === 'multiSelect')}
        {...common}
      >
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
        id={`${messageId}-control`}
        className={['range', 'color', 'file'].includes(type) ? undefined : 'field-control'}
        data-field-control={['range', 'color', 'file'].includes(type) ? undefined : true}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        type={type === 'range' ? 'range' : isOtp ? 'text' : type}
        placeholder={node.props.placeholder}
        inputMode={isOtp ? 'numeric' : undefined}
        maxLength={isOtp ? 6 : undefined}
        autoComplete={isOtp ? 'one-time-code' : undefined}
        {...common}
      />
    );
  }

  const decorated =
    node.type === 'input' &&
    ['text', 'password', 'search', 'email', 'tel', 'url', 'number', 'otp'].includes(type) &&
    (node.props.prefix || node.props.suffix || node.props.clearable);
  const fieldControl = decorated ? (
    <div className="element-input-adornment field-control" data-field-control>
      {node.props.prefix && <span>{node.props.prefix}</span>}
      {control}
      {node.props.clearable && value && (
        <button
          type="button"
          aria-label={`${label} 지우기`}
          disabled={node.props.disabled}
          onClick={() => {
            setValue('');
            document.getElementById(`${messageId}-control`)?.focus();
          }}
        >
          ×
        </button>
      )}
      {node.props.suffix && <span>{node.props.suffix}</span>}
    </div>
  ) : (
    control
  );

  return (
    <div className="element-field-group">
      <div className={`${labelClass}${node.props.errorText ? ' has-error' : ''}`}>
        {isLabelRight ? (
          <>
            {fieldControl}
            {showLabel && (
              <label htmlFor={`${messageId}-control`} className="element-field-label">
                {label}
              </label>
            )}
          </>
        ) : (
          <>
            {showLabel && (
              <label htmlFor={`${messageId}-control`} className="element-field-label">
                {label}
              </label>
            )}
            {fieldControl}
          </>
        )}
      </div>
      {(node.props.errorText || node.props.description) && (
        <p id={messageId} className={node.props.errorText ? 'field-error' : 'field-description'}>
          {node.props.errorText || node.props.description}
        </p>
      )}
    </div>
  );
}
