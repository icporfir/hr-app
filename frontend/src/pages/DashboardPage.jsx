// =====================================================================
// DashboardPage — carduri statistici + grafice pentru toate rolurile
// Pentru ANGAJAT: carduri personale (cereri proprii)
// Pentru MANAGER/ADMIN_HR: statistici globale + grafice
//
// Widget-uri jos (Prompt 6+7):
//   - Ultimii 3 angajați adăugați (doar MANAGER/ADMIN_HR)
//   - Notificări recente (toate rolurile)
// =====================================================================

import { useEffect, useState } from 'react';
import { Users, CalendarClock, UserCheck, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { statisticsService } from '../services/statisticsService';
import { leaveService } from '../services/leaveService';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Badge, { leaveStatusLabel, leaveStatusVariant } from '../components/ui/Badge';
import RecentEmployeesWidget from '../components/dashboard/RecentEmployeesWidget';
import RecentNotificationsWidget from '../components/dashboard/RecentNotificationsWidget';


// Paleta pentru grafice — tonuri de albastru + accente
const CHART_COLORS = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

export default function DashboardPage() {
  const { user, isEmployee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [leavesByDept, setLeavesByDept] = useState([]);
  const [employeesByDept, setEmployeesByDept] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        // Paralel — toate cererile în același timp
        const promises = [
          leaveService.list().then(setMyLeaves).catch(() => {}),
        ];

        // Doar pentru MANAGER / ADMIN_HR — statistici globale
        if (!isEmployee()) {
          promises.push(statisticsService.overview().then(setOverview).catch(() => {}));
          promises.push(statisticsService.leavesByDepartment().then(setLeavesByDept).catch(() => {}));
          promises.push(statisticsService.employeesByDepartment().then(setEmployeesByDept).catch(() => {}));
        }

        await Promise.all(promises);
      } finally {
        setLoading(false);
      }
    })();
  }, [isEmployee]);

  if (loading) return <Spinner />;

  const displayName = user?.employee ? user.employee.firstName : user?.email;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Salut, {displayName}! 👋</h1>
        <p className="text-sm text-gray-500 mt-1">
          Iată un rezumat al activității tale de azi.
        </p>
      </div>

      {/* Carduri statistici — doar pentru MANAGER / ADMIN_HR */}
      {/* Fiecare card are prop-ul `to` → devine clickabil și duce la pagina corespunzătoare */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Angajați activi"
            value={overview.totalEmployees}
            color="blue"
            to="/angajati"
          />
          <StatCard
            icon={CalendarClock}
            label="Cereri în așteptare"
            value={overview.pendingLeaves}
            color="yellow"
            to="/concedii?status=IN_ASTEPTARE"
          />
          <StatCard
            icon={UserCheck}
            label="Prezenți azi"
            value={overview.presentToday}
            color="green"
            to="/pontaj"
          />
          <StatCard
            icon={Briefcase}
            label="Joburi deschise"
            value={overview.openJobs}
            color="purple"
            to="/recrutare"
          />
        </div>
      )}

      {/* Zona cu 2 coloane pe desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Grafic concedii pe departamente */}
        {leavesByDept.length > 0 && (
          <Card title="Concedii pe departamente (luna curentă)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leavesByDept}>
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1E40AF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Grafic distribuție angajați */}
        {employeesByDept.length > 0 && (
          <Card title="Distribuție angajați pe departamente">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={employeesByDept}
                  dataKey="count"
                  nameKey="department"
                  outerRadius={90}
                  label={(e) => `${e.department}: ${e.count}`}
                >
                  {employeesByDept.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Ultimele mele cereri de concediu (toate rolurile) */}
        <Card title="Ultimele cereri de concediu" className="lg:col-span-2">
          {myLeaves.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              Nu ai nicio cerere înregistrată.
            </p>
          ) : (
            <div className="space-y-2">
              {myLeaves.slice(0, 5).map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                    </p>
                    <p className="text-xs text-gray-500">
                        {leave.leaveType || leave.type} · {leave.daysCount} zile
                    </p>
                  </div>
                  <Badge variant={leaveStatusVariant(leave.status)}>
                    {leaveStatusLabel(leave.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Widget-uri jos — vizibilitate diferită în funcție de rol */}
      <div className={`grid gap-6 ${!isEmployee() ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* "Ultimii angajați" — doar pentru ADMIN_HR și MANAGER */}
        {!isEmployee() && <RecentEmployeesWidget />}

        {/* "Notificări recente" — pentru toate rolurile */}
        <RecentNotificationsWidget />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// StatCard — card mic cu iconiță, label și valoare
// Dacă primește prop-ul `to`, devine link clickabil cu hover effect
// -------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, color = 'blue', to }) {
  const bgColors = {
    blue:   'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  // Conținutul cardului — identic pentru ambele variante (static / link)
  const content = (
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bgColors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );

  // Dacă primim `to`, randăm ca Link cu hover effect + cursor pointer
  // Folosim `block` ca să ocupe toată lățimea cardului
  if (to) {
    return (
      <Link
        to={to}
        className="card block transition hover:shadow-md hover:-translate-y-0.5 hover:border-primary-200 cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  // Fallback — card static (fără link), pentru retro-compatibilitate
  return <div className="card">{content}</div>;
}

// Helper - Formatare data în format romanesc (ex: 15 Mar 2024)
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}