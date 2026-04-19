// =====================================================================
// Widget Dashboard — ultimii 3 angajați adăugați
// Vizibil doar pentru ADMIN_HR și MANAGER (endpoint restricționat pe backend)
// Click pe un angajat → navigare la pagina de profil /angajati/:id
// =====================================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { statisticsService } from '../../services/statisticsService';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

/**
 * Format relativ de timp pentru afișare ("acum X zile/luni")
 * @param {string} dateStr - timestamp ISO
 */
const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return 'astăzi';
  if (days === 1) return 'acum 1 zi';
  if (days < 30)  return `acum ${days} zile`;

  const months = Math.floor(days / 30);
  if (months === 1) return 'acum 1 lună';
  if (months < 12)  return `acum ${months} luni`;

  const years = Math.floor(months / 12);
  return years === 1 ? 'acum 1 an' : `acum ${years} ani`;
};

export default function RecentEmployeesWidget() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Funcție async internă — pattern recomandat pentru a evita
    // warning-ul "react-hooks/set-state-in-effect"
    const loadRecent = async () => {
      try {
        const data = await statisticsService.recentEmployees(3);
        setEmployees(data);
      } catch {
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecent();
  }, []);

  return (
    <Card
      title="Ultimii angajați adăugați"
      subtitle="Cele mai recente adăugiri în echipă"
    >
      {loading ? (
        <Spinner />
      ) : employees.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          Nu există angajați recenți.
        </p>
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => (
            <Link
              key={emp.id}
              to={`/angajati/${emp.id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
            >
              {/* Avatar cu inițiale */}
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold flex-shrink-0">
                {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
              </div>

              {/* Nume + funcție + departament */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {emp.position} · {emp.department}
                </p>
              </div>

              {/* Time ago */}
              <div className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                <UserPlus size={12} />
                {timeAgo(emp.createdAt)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}