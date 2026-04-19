// =====================================================================
// Service pentru modulul Concedii
// Include și metode noi (Prompt 6): exportExcel + calendar
// =====================================================================

import api from './api';

export const leaveService = {
  /** Depune o cerere nouă de concediu */
  create: async (data) => {
    const res = await api.post('/leaves', data);
    return res.data.data;
  },

  /** Lista cererilor (filtrată după rol pe backend) */
  list: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status)     params.append('status', filters.status);
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    const res = await api.get(`/leaves?${params.toString()}`);
    return res.data.data;
  },

  /** Detalii cerere */
  getById: async (id) => {
    const res = await api.get(`/leaves/${id}`);
    return res.data.data;
  },

  /** Aprobare cerere (doar MANAGER/ADMIN_HR) */
  approve: async (id) => {
    const res = await api.put(`/leaves/${id}/approve`);
    return res.data.data;
  },

  /** Respingere cerere cu motiv */
  reject: async (id, reviewNote) => {
    const res = await api.put(`/leaves/${id}/reject`, { reviewNote });
    return res.data.data;
  },

  /** Anulare cerere (doar autor, doar dacă e IN_ASTEPTARE) */
  cancel: async (id) => {
    const res = await api.put(`/leaves/${id}/cancel`);
    return res.data.data;
  },

  /**
   * Exportă cererile de concediu ca fișier Excel.
   * Declanșează automat download-ul în browser.
   */
  exportExcel: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status)    params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate)   params.append('endDate', filters.endDate);

    // responseType: 'blob' — primim fișier binar, nu JSON
    const res = await api.get(`/leaves/export?${params.toString()}`, {
      responseType: 'blob',
    });

    // Creăm un URL temporar din blob și declanșăm download-ul
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;

    // Numele fișierului — din header sau generat local
    const contentDisposition = res.headers['content-disposition'];
    let fileName = `cereri_concediu_${new Date().toISOString().slice(0, 10)}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?$/);
      if (match) fileName = match[1].replace(/"/g, '');
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url); // eliberăm memoria
  },

  /**
   * Aduce concediile aprobate dintr-o lună pentru calendarul vizual.
   * @param {string} month - format "YYYY-MM" (default: luna curentă)
   */
  calendar: async (month) => {
    const params = month ? `?month=${month}` : '';
    const res = await api.get(`/leaves/calendar${params}`);
    return res.data.data;
  },
};