import { useState } from 'react';
import { Calendar } from 'lucide-react';
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
  const labelClass = `element-field element-label-${node.props.labelPosition ?? 'top'}`;
  const common = { disabled: node.props.disabled, required: node.props.required };
  const options = (node.props.items ?? '').split('\n').filter(Boolean);

  if (node.type === 'fileUpload') return <FileUploadControl node={node} />;

  if (node.type === 'switch')
    return (
      <div className={labelClass}>
        {showLabel && node.props.labelPosition === 'top' && (
          <span className="element-field-label">{label}</span>
        )}
        <label className="element-switch">
          <input
            role="switch"
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            {...common}
          />
          {(!showLabel || node.props.labelPosition !== 'top') && <span>{label}</span>}
        </label>
      </div>
    );

  if (node.type === 'checkbox')
    return (
      <div className={labelClass}>
        {showLabel && node.props.labelPosition === 'top' && (
          <span className="element-field-label">{label}</span>
        )}
        <label className="element-checkbox-single">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            {...common}
          />
          {(!showLabel || node.props.labelPosition !== 'top') && <span>{label}</span>}
        </label>
      </div>
    );

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
      <div className={labelClass}>
        {showLabel && <span className="element-field-label">{label}</span>}
        <div className="element-date-range-single">
          <input
            type="text"
            readOnly
            value="2026-09-01 ~ 2026-09-15"
            placeholder="시작일 ~ 종료일"
            disabled={common.disabled}
          />
          <Calendar size={18} className="calendar-icon" />
        </div>
      </div>
    );

  let control;
  const nodeType = node.type as string;
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
      {showLabel && <span className="element-field-label">{label}</span>}
      {control}
    </label>
  );
}
