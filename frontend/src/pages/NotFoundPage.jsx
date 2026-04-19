// frontend/src/pages/NotFoundPage.jsx
// =====================================================================
// Pagină 404 — afișată pentru rute inexistente
// =====================================================================

import { FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <FileQuestion size={64} className="mx-auto text-gray-400 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">404 — Pagina nu există</h1>
        <p className="text-gray-600 mb-6">
          Pagina pe care încerci s-o accesezi nu a fost găsită.
        </p>
        <Button onClick={() => navigate('/dashboard')}>Înapoi la Dashboard</Button>
      </div>
    </div>
  );
}