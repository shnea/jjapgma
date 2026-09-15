import { useState } from 'react';
import { DatePickerControl } from './DatePickerControl';
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

export function FormElement({ node }: { node: UiNode }) {
  const [checked, setChecked] = useState(false);
  const label = `${node.props.text}${node.props.required ? ' *' : ''}`;
  const showLabel = node.props.labelVisible !== false;
  const labelPosition = node.props.labelPosition ?? (node.type === 'checkbox' ? 'right' : 'top');
  const isLabelRight = labelPosition === 'right';
  const labelClass = `element-field element-label-${labelPosition}`;
  const common = {
    disabled: node.props.disabled,
    required: node.props.required,
    'aria-label': label,
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
