import type { ReactNode } from 'react';
export function ChoiceField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string; icon?: ReactNode }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="choice-field">
      <legend>{label}</legend>
      <div className="choice-buttons" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={`${label}: ${option.label}`}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
