// =====================================================================
// AuthContext — starea globală a autentificării (cu refresh token)
// Storage:
//   - localStorage persistent: hr_token, hr_refresh_token, hr_user
//   - Refresh token e folosit automat de interceptor-ul Axios
// =====================================================================

import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const STORAGE_KEYS = {
  TOKEN: 'hr_token',
  REFRESH_TOKEN: 'hr_refresh_token',
  USER: 'hr_user',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);

    if (!savedToken || !savedUser) {
      setLoading(false);
      return;
    }

    // Validăm token-ul prin /auth/me
    // Dacă access token-ul a expirat, interceptorul va încerca refresh automat
    api.get('/auth/me')
      .then((res) => {
        setToken(localStorage.getItem(STORAGE_KEYS.TOKEN)); // ia token-ul curent (poate fi refresh-uit)
        setUser(res.data.user);
      })
      .catch(() => {
        // Token-urile nu mai sunt valide (nici refresh n-a reușit)
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { email, password, rememberMe });
    const { token: newToken, refreshToken, user: newUser } = response.data;

    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    // Anunță backend-ul să șteargă refresh token-ul din DB
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Dacă eșuează, oricum curățăm local
    }

    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setToken(null);
    setUser(null);
  };

  const hasRole = (...roles) => user && roles.includes(user.role);
  const isAdmin = () => user?.role === 'ADMIN_HR';
  const isManager = () => user?.role === 'MANAGER';
  const isEmployee = () => user?.role === 'ANGAJAT';

  const value = {
    user, token, loading,
    isAuthenticated: !!user,
    login, logout,
    hasRole, isAdmin, isManager, isEmployee,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth trebuie folosit în interiorul <AuthProvider>');
  }
  return context;
}