// =====================================================================
// Service Employee — toate operațiunile CRUD pentru angajați
// =====================================================================

import api from './api';

export const employeeService = {
  // Listă angajați (filtrată server-side după rol)
  list: async () => {
    const res = await api.get('/employees');
    return res.data.data; // { success, count, data: [...] } → întoarce array-ul
  },

  // Detalii angajat
  getById: async (id) => {
    const res = await api.get(`/employees/${id}`);
    return res.data.data;
  },

  // Creare angajat nou (doar ADMIN_HR)
  create: async (data) => {
    const res = await api.post('/employees', data);
    return res.data.data;
  },

  // Actualizare angajat
  update: async (id, data) => {
    const res = await api.put(`/employees/${id}`, data);
    return res.data.data;
  },

  // Ștergere (soft — dezactivează contul)
  remove: async (id) => {
    const res = await api.delete(`/employees/${id}`);
    return res.data;
  },

  // Listă departamente (folosită în dropdown-uri)
  listDepartments: async () => {
    const res = await api.get('/employees/departments/list');
    return res.data.data;
  },
};