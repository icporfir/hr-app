// =====================================================
// Instanță Axios configurată pentru comunicare cu backend
// Adaugă automat token JWT la fiecare request (după login)
// =====================================================

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 secunde timeout
});

// Interceptor REQUEST — adaugă token JWT dacă există
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor RESPONSE — gestionează erori comune
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token expirat / invalid → deconectare
    if (error.response?.status === 401) {
      localStorage.removeItem('hr_token');
      // Redirect către login (vom implementa în Prompt 2)
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;