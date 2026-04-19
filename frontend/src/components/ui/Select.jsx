// =====================================================================
// Select — dropdown cu label și opțiuni
// options: array de { value, label }
// =====================================================================

import { useId } from 'react';

export default function Select({
  label,
  error,
  options = [],
  placeholder = 'Selectează...',
  id,
  ...props
}) {
  const autoId = useId();
  const selectId = id || autoId;

  return (
    <div>
      {label && <label htmlFor={selectId} className="label-field">{label}</label>}
      <select
        id={selectId}
        className={`input-field ${error ? 'border-danger' : ''}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-sm text-danger mt-1">{error}</p>}
    </div>
  );
}