import type { ButtonHTMLAttributes } from 'react';
export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      className={`button button-${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading ? '처리 중…' : children}
    </button>
  );
}
