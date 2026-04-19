// frontend/src/pages/ForbiddenPage.jsx
// =====================================================================
// Pagină 403 — afișată când user-ul nu are rolul necesar
// =====================================================================

import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <ShieldX size={64} className="mx-auto text-danger mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">403 — Acces interzis</h1>
        <p className="text-gray-600 mb-6">
          Nu ai permisiunile necesare pentru a accesa această pagină.
        </p>
        <Button onClick={() => navigate('/dashboard')}>Înapoi la Dashboard</Button>
      </div>
    </div>
  );
}