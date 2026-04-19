// =====================================================================
// ProtectedRoute — wrap peste rute care cer autentificare
// Dacă nu ești logat → redirect la /login
// Dacă rolul nu e permis → redirect la /forbidden
// =====================================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './ui/Spinner';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Așteaptă verificarea sesiunii la montare
  if (loading) return <Spinner fullScreen />;

  // Nu e logat — redirect la login, păstrează încotro voia să meargă
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verifică rolul (dacă ruta cere un anumit rol)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}