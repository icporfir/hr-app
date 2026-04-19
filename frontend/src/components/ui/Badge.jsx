// =====================================================================
// Badge — etichetă mică colorată (ex: status concedii)
// =====================================================================

import clsx from 'clsx';

const VARIANTS = {
  gray:    'bg-gray-100 text-gray-700',
  blue:    'bg-blue-100 text-blue-700',
  green:   'bg-green-100 text-green-700',
  yellow:  'bg-yellow-100 text-yellow-700',
  red:     'bg-red-100 text-red-700',
  purple:  'bg-purple-100 text-purple-700',
};

export default function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      VARIANTS[variant],
      className
    )}>
      {children}
    </span>
  );
}

// Helper — mapare status cerere concediu → variantă culoare
export const leaveStatusVariant = (status) => ({
  IN_ASTEPTARE: 'yellow',
  APROBATA:     'green',
  RESPINSA:     'red',
  ANULATA:      'gray',
}[status] || 'gray');

// Helper — traducere status în română afișabil
export const leaveStatusLabel = (status) => ({
  IN_ASTEPTARE: 'În așteptare',
  APROBATA:     'Aprobată',
  RESPINSA:     'Respinsă',
  ANULATA:      'Anulată',
}[status] || status);