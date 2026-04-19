// =====================================================================
// Layout — shell-ul aplicației (sidebar + topbar + zonă conținut)
// Se folosește ca wrapper pentru toate paginile autentificate
// =====================================================================

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Outlet = locul unde se randează pagina activă */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}