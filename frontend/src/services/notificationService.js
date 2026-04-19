// =====================================================================
// Service pentru modulul Notificări
// Toate apelurile necesită autentificare (token JWT).
// Backend-ul filtrează automat pe userId — vedem doar propriile notificări.
// =====================================================================

import api from './api';

export const notificationService = {
  /**
   * Ultimele N notificări + numărul total de necitite.
   * Folosit pe widget-ul din Dashboard.
   */
  recent: async (limit = 5) => {
    const res = await api.get(`/notifications/recent?limit=${limit}`);
    // Returnăm tot obiectul (nu doar data) ca să avem și unreadCount
    return res.data;
  },

  /** Toate notificările user-ului, cu paginare */
  list: async (offset = 0, limit = 50) => {
    const res = await api.get(`/notifications?limit=${limit}&offset=${offset}`);
    return res.data;
  },

  /** Marchează o notificare ca citită */
  markAsRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data.data;
  },

  /** Marchează toate notificările ca citite */
  markAllAsRead: async () => {
    const res = await api.put('/notifications/read-all');
    return res.data;
  },
};