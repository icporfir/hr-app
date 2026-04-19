// =====================================================================
// App — root component: rutare + toast notifications
// Structura rutelor:
//   /login → public
//   /* → Layout cu sidebar (protejat)
//     /dashboard, /angajati, /concedii, /pontaj, /recrutare (admin), /rapoarte (admin+mgr)
// =====================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context & protecții
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layout
import Layout from './components/layout/Layout';

// Pagini
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import LeavesPage from './pages/LeavesPage';
import LeaveNewPage from './pages/LeaveNewPage';
import AttendancePage from './pages/AttendancePage';
import ReportsPage from './pages/ReportsPage';
import RecruitmentPage from './pages/RecruitmentPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Toast notifications — disponibile global */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontSize: '14px' },
          }}
        />

        <Routes>
          {/* Rute publice */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          {/* Rute protejate — toate sub Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Redirect / → /dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            <Route path="dashboard" element={<DashboardPage />} />

            {/* Angajați */}
            <Route path="angajati" element={<EmployeesPage />} />
            <Route
              path="angajati/nou"
              element={
                <ProtectedRoute allowedRoles={['ADMIN_HR']}>
                  <EmployeeFormPage />
                </ProtectedRoute>
              }
            />
            <Route path="angajati/:id" element={<EmployeeDetailPage />} />
            <Route
              path="angajati/:id/editeaza"
              element={
                <ProtectedRoute allowedRoles={['ADMIN_HR']}>
                  <EmployeeFormPage />
                </ProtectedRoute>
              }
            />

            {/* Concedii */}
            <Route path="concedii" element={<LeavesPage />} />
            <Route path="concedii/cerere-noua" element={<LeaveNewPage />} />

            {/* Pontaj */}
            <Route path="pontaj" element={<AttendancePage />} />

            {/* Recrutare — doar ADMIN_HR */}
            <Route
              path="recrutare"
              element={
                <ProtectedRoute allowedRoles={['ADMIN_HR']}>
                  <RecruitmentPage />
                </ProtectedRoute>
              }
            />

            {/* Rapoarte — ADMIN_HR + MANAGER */}
            <Route
              path="rapoarte"
              element={
                <ProtectedRoute allowedRoles={['ADMIN_HR', 'MANAGER']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}