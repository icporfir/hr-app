// =====================================================================
// dateHelpers — funcții pentru calcule de date
// Folosite în special pentru cererile de concediu
// =====================================================================

/**
 * Calculează numărul de zile lucrătoare între două date inclusiv.
 * Exclude sâmbete (6) și duminici (0).
 *
 * @param {Date|string} startDate — data de început
 * @param {Date|string} endDate — data de sfârșit
 * @returns {number} număr zile lucrătoare
 *
 * Exemple:
 *   calculateWorkDays('2026-05-10', '2026-05-10') → 1 (luni)
 *   calculateWorkDays('2026-05-09', '2026-05-10') → 1 (sâmbătă-duminică, doar duminica... de fapt duminica nu e lucrătoare → rezultat=0, dar startul e sâmbătă → 0)
 *   calculateWorkDays('2026-05-11', '2026-05-15') → 5 (luni-vineri)
 */
export const calculateWorkDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Normalizăm la miezul nopții pentru comparații exacte
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < start) {
    return 0;
  }

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay(); // 0 = Duminică, 6 = Sâmbătă
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

/**
 * Verifică dacă două intervale de dată se suprapun.
 * Util pentru a preveni cereri de concediu suprapuse.
 */
export const datesOverlap = (start1, end1, start2, end2) => {
  return new Date(start1) <= new Date(end2) && new Date(start2) <= new Date(end1);
};