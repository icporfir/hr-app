// =====================================================================
// Button — wrapper cu variante (primary, secondary, danger) + loading
// =====================================================================

import clsx from 'clsx';

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const baseClasses = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    danger:    'btn-danger',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(baseClasses[variant], className)}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75" />
          </svg>
          Se procesează...
        </>
      ) : (
        children
      )}
    </button>
  );
}