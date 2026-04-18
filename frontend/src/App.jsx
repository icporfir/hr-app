// =====================================================
// Componenta ROOT — configurează rutarea
// În Prompt 2+ vom adăuga rute protejate și pagini reale
// =====================================================

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from './services/api';

// Pagină de test — verifică conexiunea cu backend-ul
function HomePage() {
  const [status, setStatus] = useState('verificare...');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Apel către /api/health la încărcarea paginii
    api.get('/health')
      .then((res) => {
        setStatus(res.data.message);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold text-primary-700 mb-4">
          🏢 Aplicație HR
        </h1>
        <p className="text-gray-600 mb-6">
          Soluție web pentru eficientizarea activităților din departamentul de Resurse Umane
        </p>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold mb-3">Status conexiune backend</h2>
          {error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              ❌ Eroare: {error}
            </div>
          ) : (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg">
              ✅ {status}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3 justify-center">
          <Link to="/about" className="btn-primary">
            Despre aplicație
          </Link>
        </div>
      </div>
    </div>
  );
}

// Pagină placeholder
function AboutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-4">Despre proiect</h1>
        <p className="text-gray-700 mb-4">
          Aplicație dezvoltată pentru lucrarea de licență:
          <strong> "Soluție web/mobilă pentru eficientizarea activităților
          din departamentul de Resurse Umane"</strong>.
        </p>
        <p className="text-gray-600 text-sm">
          Stack: React + Tailwind + Express + PostgreSQL + Prisma + JWT
        </p>
        <Link to="/" className="btn-secondary inline-block mt-4">
          ← Înapoi
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        {/* Rutele reale vor fi adăugate în Prompt 2:
            /login, /dashboard, /employees, /leaves etc. */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;