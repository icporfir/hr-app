// =====================================================================
// Sidebar — meniu lateral cu link-uri filtrate pe rol
// =====================================================================

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Clock,
  Briefcase,
  BarChart3,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

// Definim meniul — fiecare item are rolurile care pot să-l vadă
const MENU_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, roles: ['ADMIN_HR', 'MANAGER', 'ANGAJAT'] },
  { to: '/angajati',   label: 'Angajați',   icon: Users,           roles: ['ADMIN_HR', 'MANAGER', 'ANGAJAT'] },
  { to: '/concedii',   label: 'Concedii',   icon: CalendarDays,    roles: ['ADMIN_HR', 'MANAGER', 'ANGAJAT'] },
  { to: '/pontaj',     label: 'Pontaj',     icon: Clock,           roles: ['ADMIN_HR', 'MANAGER', 'ANGAJAT'] },
  { to: '/recrutare',  label: 'Recrutare',  icon: Briefcase,       roles: ['ADMIN_HR'] },
  { to: '/rapoarte',   label: 'Rapoarte',   icon: BarChart3,       roles: ['ADMIN_HR', 'MANAGER'] },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  // Filtrăm elementele după rolul utilizatorului curent
  const visibleItems = MENU_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <>
      {/* Overlay pe mobil când sidebar-ul e deschis */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar — comportament dual:
          - Mobil: fixed (overlay peste conținut), toggled cu open/close
          - Desktop (lg+): sticky, rămâne în flux, întotdeauna vizibil
          `sticky top-0 h-screen` asigură că ocupă toată înălțimea viewport-ului
          chiar și când pagina are conținut lung (ex: tabel de pontaj 30 rânduri). */}
      <aside
        className={clsx(
          // Mobil: overlay fix
          'fixed top-0 left-0 z-40 h-screen w-64 bg-primary-800 text-white transition-transform',
          // Desktop: sticky, ocupă toată înălțimea viewport-ului (fără spațiu alb sub)
          'lg:sticky lg:translate-x-0 lg:flex-shrink-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo / brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-primary-700">
          <Building2 size={28} />
          <span className="font-semibold text-lg">HR Solution</span>
        </div>

        {/* Meniu navigare */}
        <nav className="p-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition',
                    isActive
                      ? 'bg-primary-700 text-white'
                      : 'text-primary-100 hover:bg-primary-700/50'
                  )
                }
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}