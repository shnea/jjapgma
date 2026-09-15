import { useState } from 'react';
import type { UiNode } from '@jjapgma/ui-spec';
import { FileUploadControl } from '../files/FileAssets';
export const formTypes = [
  'input',
  'textarea',
  'checkbox',
  'password',
  'number',
  'search',
  'select',
  'multiSelect',
  'radio',
  'switch',
  'slider',
  'date',
  'time',
  'dateRange',
  'fileUpload',
  'otp',
  'colorPicker',
];
const inputType: Record<string, string> = {
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
      <fieldset disabled={common.disabled}>
        {showLabel && <legend>{label}</legend>}
        <input
          className="element-date-range-single"
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DD ~ YYYY-MM-DD"
          required={common.required}
        />
      </fieldset>
    );
  if (node.type === 'checkbox' || node.type === 'switch')
    return (
      <fieldset
        className={`element-options option-${node.props.optionDirection ?? 'column'} option-align-${node.props.optionAlign ?? 'left'}`}
      >
        <label className="render-checkbox">
          <input
            type="checkbox"
            role={node.type === 'switch' ? 'switch' : undefined}
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            {...common}
          />
          {label}
        </label>
      </fieldset>
    );
  let control;
  if (node.type === 'textarea')
    control = <textarea placeholder={node.props.placeholder} {...common} />;
  else if (node.type === 'select' || node.type === 'multiSelect')
    control = (
      <select multiple={node.type === 'multiSelect'} {...common}>
        {options.map((option, index) => (
          <option key={index}>{option}</option>
        ))}
      </select>
    );
  else {
    const type =
      node.type === 'input' ? (node.props.controlType ?? 'text') : (inputType[node.type] ?? 'text');
    control = (
      <input
        type={type}
        placeholder={node.props.placeholder}
        inputMode={node.type === 'otp' ? 'numeric' : undefined}
        maxLength={node.type === 'otp' ? 6 : undefined}
        autoComplete={node.type === 'otp' ? 'one-time-code' : undefined}
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
