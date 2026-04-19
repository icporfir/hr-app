// =====================================================================
// Service Statistics — date pentru Dashboard și Rapoarte
// =====================================================================

import api from './api';

export const statisticsService = {
  overview: async () => {
    const res = await api.get('/statistics/overview');
    return res.data.data;
  },

  attendanceTrend: async () => {
    const res = await api.get('/statistics/attendance-trend');
    return res.data.data;
  },

  leavesByDepartment: async () => {
    const res = await api.get('/statistics/leaves-by-department');
    return res.data.data;
  },

  employeesByDepartment: async () => {
    const res = await api.get('/statistics/employees-by-department');
    return res.data.data;
  },

  hoursThisWeek: async () => {
    const res = await api.get('/statistics/hours-this-week');
    return res.data.data;
  },

  /** Ultimii N angajați adăugați (default 3) — pentru Dashboard */
  recentEmployees: async (limit = 3) => {
    const res = await api.get(`/statistics/recent-employees?limit=${limit}`);
    return res.data.data;
  },
};