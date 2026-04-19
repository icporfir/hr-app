// =====================================================================
// LoginPage — autentificare (email + parolă + remember me)
// =====================================================================

import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Building2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dacă ești deja logat, redirect la dashboard
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  // Unde să redirectăm după login (dacă a fost blocat de ProtectedRoute)
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password, remember);
      toast.success('Autentificare reușită!');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Backend-ul trimite mesaje de eroare clare în err.response.data.message
      const msg = err.response?.data?.message || 'Eroare la autentificare. Încearcă din nou.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-gray-100">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-700 flex items-center justify-center mb-4">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HR Solution</h1>
          <p className="text-sm text-gray-500 mt-1">Autentifică-te pentru a continua</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="nume@firma.ro"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Parolă"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {/* Remember me */}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-gray-300 text-primary-700 focus:ring-primary-500"
            />
            Ține-mă minte
          </label>

          {/* Mesaj eroare */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-danger text-sm p-3 rounded-lg">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Autentificare
          </Button>
        </form>

        {/* Hint cu conturile de test (util în dezvoltare) */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-500">
          <p className="font-semibold mb-1">Conturi de test:</p>
          <p>admin.hr@firma.ro · manager.it@firma.ro · dev1@firma.ro</p>
          <p className="mt-1">Parolă comună: <code className="bg-gray-100 px-1 rounded">Parola123!</code></p>
        </div>
      </div>
    </div>
  );
}