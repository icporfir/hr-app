// =====================================================================
// Topbar — bara de sus cu info user + logout + toggle sidebar pe mobil
// =====================================================================

import { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
  ADMIN_HR: 'Admin HR',
  MANAGER:  'Manager',
  ANGAJAT:  'Angajat',
};

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Închide dropdown-ul la click în afară
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Buton hamburger (doar pe mobil) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-600 hover:text-gray-900"
        aria-label="Deschide meniul"
      >
        <Menu size={24} />
      </button>

      {/* Spațiu pe desktop — împinge user-ul la dreapta */}
      <div className="hidden lg:block" />

      {/* Dropdown user */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-lg transition"
        >
          <div className="w-9 h-9 rounded-full bg-primary-700 text-white flex items-center justify-center font-semibold">
            {displayName?.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[user?.role]}</p>
          </div>
          <ChevronDown size={16} className="text-gray-400" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate(`/angajati/${user.employee?.id}`);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <UserIcon size={16} />
              Profilul meu
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-gray-50"
            >
              <LogOut size={16} />
              Delogare
            </button>
          </div>
        )}
      </div>
    </header>
  );
}