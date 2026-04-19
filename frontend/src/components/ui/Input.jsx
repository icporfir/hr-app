// =====================================================================
// Input — câmp formular cu label și mesaj de eroare
// Folosim useId (React 18+) pentru ID stabil între randări
// =====================================================================

import { useId } from 'react';

export default function Input({
  label,
  error,
  type = 'text',
  id,
  ...props
}) {
  // useId generează un ID unic și stabil — nu se schimbă la re-render
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label-field">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`input-field ${error ? 'border-danger focus:ring-red-400' : ''}`}
        {...props}
      />
      {error && <p className="text-sm text-danger mt-1">{error}</p>}
    </div>
  );
}