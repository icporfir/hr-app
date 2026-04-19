// =====================================================================
// Instanță Axios + interceptor pentru auto-refresh pe 401
// =====================================================================

import axios from 'axios';
import { STORAGE_KEYS } from '../context/AuthContext';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Instanță separată pentru /auth/refresh — fără interceptor (evită recursivitate)
const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Interceptor REQUEST — atașează access token-ul la fiecare request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------------------------------------------------------
// LOGICA DE REFRESH
// -------------------------------------------------------------------
// Dacă mai multe requests fail simultan pe 401, vrem să fac UN SINGUR
// refresh și toate să aștepte rezultatul. Folosim un "lock" global.

let isRefreshing = false;
let failedQueue = [];

/** Procesează cererile din coadă după ce refresh-ul s-a terminat */
const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor RESPONSE — intercepteaza 401 și încearcă refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Dacă nu e 401 sau am mai încercat deja refresh pentru acest request → throw
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Dacă eroarea vine chiar de la /auth/refresh → logout total
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    // Marcăm cererea ca „încercată" pentru a nu intra în buclă
    originalRequest._retry = true;

    // Dacă deja e un refresh în curs, așteaptă-l
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;

    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      isRefreshing = false;
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    try {
      // Apelează /auth/refresh cu instanța separată (fără interceptor)
      const { data } = await refreshApi.post('/auth/refresh', { refreshToken });
      const newToken = data.token;

      // Salvează noul access token
      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);

      // Procesează toate cererile în așteptare
      processQueue(null, newToken);

      // Retrimite cererea originală cu noul token
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh-ul a eșuat → logout total
      processQueue(refreshError, null);
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

/** Curăță localStorage și redirectează la login */
function clearAuthAndRedirect() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

export default api;