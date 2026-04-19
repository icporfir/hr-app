// =====================================================================
// Service Attendance — pontaj (clasic + lunar)
// =====================================================================

import api from './api';

export const attendanceService = {
  // --- Pontaj clasic (check-in/check-out) — păstrat pentru compatibilitate ---

  checkIn: async () => {
    const res = await api.post('/attendance/check-in');
    return res.data.data;
  },

  checkOut: async () => {
    const res = await api.post('/attendance/check-out');
    return res.data.data;
  },

  // Starea pontajului azi pentru user-ul curent
  myToday: async () => {
    const res = await api.get('/attendance/me/today');
    return res.data.data;
  },

  // Istoric pontaj pentru un angajat
  history: async (employeeId) => {
    const res = await api.get(`/attendance/employee/${employeeId}`);
    return res.data.data;
  },

  // --- Pontaj lunar (Prompt 6+7) ---

  /**
   * Pontajul lunii pentru un angajat — toate zilele pre-populate.
   * Weekendurile marcate automat ca WEEKEND.
   * Zilele de concediu aprobat marcate automat ca CONCEDIU.
   *
   * @param {string} month - "YYYY-MM" (default: luna curentă)
   * @param {number} [employeeId] - opțional, pentru Manager/HR care văd subordonați
   * @returns {Promise<{ month, employeeId, totalHours, daysInMonth, data }>}
   */
  monthly: async (month, employeeId) => {
    const params = new URLSearchParams();
    if (month)      params.append('month', month);
    if (employeeId) params.append('employeeId', employeeId);
    const res = await api.get(`/attendance/monthly?${params.toString()}`);
    return res.data; // întreg obiectul (data + metadata)
  },

  /**
   * Salvare în batch a mai multor zile deodată.
   * Doar angajatul își poate salva propriul pontaj.
   *
   * @param {Array} entries - [{ date, activity, checkIn, checkOut, note }]
   */
  bulkSave: async (entries) => {
    const res = await api.put('/attendance/bulk', { entries });
    return res.data;
  },
};