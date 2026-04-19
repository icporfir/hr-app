// =====================================================================
// AttendancePage — Pontaj stil foaie lunară
//
// Funcționalități (Prompt 6+7):
//  - Tabel cu toate zilele lunii curente (1 rând per zi)
//  - Pre-populare: MUNCA (luni-vineri), WEEKEND (sâmbătă-duminică), CONCEDIU (din LeaveRequest)
//  - Editare inline: activitate (dropdown), check-in / check-out (HH:MM), notă
//  - Calcul automat ore lucrate la schimbare oră
//  - Buton "Salvează toate" — salvare în batch doar la final
//  - Read-only pentru Manager/HR (pot doar vedea pontajul subordonaților)
// =====================================================================

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Save, Clock, Calendar, AlertCircle,
  Briefcase, Plane, CalendarOff, XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { attendanceService } from '../services/attendanceService';
import { employeeService } from '../services/employeeService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

// Luni în limba română
const MONTHS_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

// Tipuri activitate — configurate cu iconițe și culori
const ACTIVITY_CONFIG = {
  MUNCA:      { label: 'Muncă',      icon: Briefcase,    bg: 'bg-blue-50',    text: 'text-blue-800',    badge: 'bg-blue-100' },
  WEEKEND:    { label: 'Weekend',    icon: Calendar,     bg: 'bg-gray-50',    text: 'text-gray-600',    badge: 'bg-gray-200' },
  CONCEDIU:   { label: 'Concediu',   icon: Plane,        bg: 'bg-green-50',   text: 'text-green-800',   badge: 'bg-green-100' },
  SARBATOARE: { label: 'Sărbătoare', icon: CalendarOff,  bg: 'bg-purple-50',  text: 'text-purple-800',  badge: 'bg-purple-100' },
  ABSENT:     { label: 'Absent',     icon: XCircle,      bg: 'bg-red-50',     text: 'text-red-800',     badge: 'bg-red-100' },
};

const ACTIVITY_OPTIONS = Object.keys(ACTIVITY_CONFIG);

/**
 * Calcul ore lucrate între 2 ore HH:MM (identică cu logica backend)
 */
const calcHours = (inHM, outHM) => {
  if (!inHM || !outHM || !inHM.match(/^\d{2}:\d{2}$/) || !outHM.match(/^\d{2}:\d{2}$/)) {
    return null;
  }
  const [ih, im] = inHM.split(':').map(Number);
  const [oh, om] = outHM.split(':').map(Number);
  let diff = (oh * 60 + om) - (ih * 60 + im);
  if (diff < 0) diff += 24 * 60;
  return parseFloat((diff / 60).toFixed(2));
};

/**
 * Parse "YYYY-MM-DD" → Date local (evită timezone issues)
 */
const parseISODate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function AttendancePage() {
  const { isEmployee, hasRole } = useAuth();
  const canEdit = isEmployee(); // doar angajații pot edita
  const canViewOthers = hasRole('MANAGER', 'ADMIN_HR');

  // State — luna afișată (start la luna curentă)
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // State — pontaj
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthData, setMonthData] = useState(null); // { month, totalHours, data }
  const [rows, setRows] = useState([]);             // state local editabil

  // State — selector angajat (doar pentru Manager/HR)
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // State — tracking modificări nesalvate (set de date modificate)
  const [dirtyDates, setDirtyDates] = useState(new Set());

  // ------------------------------------------------------------------
  // Încărcare listă angajați (doar pentru Manager/HR)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!canViewOthers) return;

    const loadEmployees = async () => {
      try {
        const list = await employeeService.list();
        setEmployees(list);
      } catch {
        setEmployees([]);
      }
    };

    loadEmployees();
  }, [canViewOthers]);

  // ------------------------------------------------------------------
  // Încărcare pontaj lună
  // ------------------------------------------------------------------
  useEffect(() => {
    const loadMonth = async () => {
      setLoading(true);
      try {
        const monthStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
        const result = await attendanceService.monthly(monthStr, selectedEmployeeId);
        setMonthData(result);
        setRows(result.data.map((r) => ({ ...r }))); // copie locală editabilă
        setDirtyDates(new Set()); // reset modificări la schimbarea lunii
      } catch {
        toast.error('Eroare la încărcarea pontajului.');
        setMonthData(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadMonth();
  }, [viewDate, selectedEmployeeId]);

  // ------------------------------------------------------------------
  // Handlere editare rând
  // ------------------------------------------------------------------
  const updateRow = (date, changes) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.date !== date) return r;

        const updated = { ...r, ...changes };

        // Recalculăm orele live dacă s-a schimbat check-in / check-out
        if ('checkIn' in changes || 'checkOut' in changes) {
          updated.hoursWorked = calcHours(updated.checkIn, updated.checkOut);
        }

        // Dacă se schimbă activitatea în non-MUNCA → resetăm orele
        if ('activity' in changes && changes.activity !== 'MUNCA') {
          updated.checkIn = null;
          updated.checkOut = null;
          updated.hoursWorked = null;
        }

        // Recalculăm isLocked (afectează UI-ul de editare)
        updated.isLocked = updated.activity !== 'MUNCA';

        return updated;
      })
    );

    // Marcăm data ca "dirty"
    setDirtyDates((prev) => new Set(prev).add(date));
  };

  // ------------------------------------------------------------------
  // Salvare batch
  // ------------------------------------------------------------------
  const handleSaveAll = async () => {
    if (dirtyDates.size === 0) {
      toast('Nu ai modificări de salvat.', { icon: 'ℹ️' });
      return;
    }

    const entriesToSave = rows
      .filter((r) => dirtyDates.has(r.date))
      .map((r) => ({
        date:     r.date,
        activity: r.activity,
        checkIn:  r.checkIn,
        checkOut: r.checkOut,
        note:     r.note,
      }));

    setSaving(true);
    try {
      const result = await attendanceService.bulkSave(entriesToSave);
      toast.success(result.message || 'Pontaj salvat.');
      setDirtyDates(new Set());

      // Re-încărcăm pontajul ca să actualizăm totalHours și starea din DB
      const monthStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
      const refreshed = await attendanceService.monthly(monthStr, selectedEmployeeId);
      setMonthData(refreshed);
      setRows(refreshed.data.map((r) => ({ ...r })));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Eroare la salvare.');
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------
  // Navigare lună
  // ------------------------------------------------------------------
  const goPrevMonth = () => {
    if (dirtyDates.size > 0 && !window.confirm('Ai modificări nesalvate. Vrei să le pierzi?')) {
      return;
    }
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    if (dirtyDates.size > 0 && !window.confirm('Ai modificări nesalvate. Vrei să le pierzi?')) {
      return;
    }
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const goToday = () => {
    if (dirtyDates.size > 0 && !window.confirm('Ai modificări nesalvate. Vrei să le pierzi?')) {
      return;
    }
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // ------------------------------------------------------------------
  // Sumar — total ore lucrate + distribuție pe activități
  // ------------------------------------------------------------------
  const summary = useMemo(() => {
    let totalHours = 0;
    const count = { MUNCA: 0, WEEKEND: 0, CONCEDIU: 0, SARBATOARE: 0, ABSENT: 0 };

    for (const r of rows) {
      count[r.activity] = (count[r.activity] || 0) + 1;
      if (r.activity === 'MUNCA' && r.hoursWorked) {
        totalHours += r.hoursWorked;
      }
    }

    return { totalHours: parseFloat(totalHours.toFixed(2)), count };
  }, [rows]);

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header pagină */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pontaj lunar</h1>
          <p className="text-sm text-gray-500 mt-1">
            {canEdit
              ? 'Completează-ți orele pentru fiecare zi și salvează la final.'
              : 'Vizualizare pontaj (read-only pentru acest rol).'}
          </p>
        </div>

        {/* Buton Salvează — vizibil doar pentru angajați cu modificări */}
        {canEdit && dirtyDates.size > 0 && (
          <Button onClick={handleSaveAll} loading={saving}>
            <Save size={18} />
            Salvează toate ({dirtyDates.size})
          </Button>
        )}
      </div>

      {/* Selector angajat (doar Manager/HR) */}
      {canViewOthers && employees.length > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              Vizualizează pontajul:
            </label>
            <select
              value={selectedEmployeeId || ''}
              onChange={(e) => setSelectedEmployeeId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="input-field max-w-xs"
            >
              <option value="">Pontajul meu</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} — {emp.department?.name || '—'}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Badge modificări nesalvate */}
      {canEdit && dirtyDates.size > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span className="text-sm">
            Ai <strong>{dirtyDates.size}</strong> {dirtyDates.size === 1 ? 'zi' : 'zile'} cu modificări nesalvate.
            Apasă <strong>Salvează toate</strong> pentru a le păstra.
          </span>
        </div>
      )}

      {/* Header lună + navigare */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Luna anterioară"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
            {MONTHS_RO[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h2>
          <button
            onClick={goNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Luna următoare"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button
          onClick={goToday}
          className="px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50 rounded-lg transition"
        >
          Azi
        </button>
      </div>

      {/* Sumar cu iconițe */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard
          icon={Clock}
          label="Total ore muncă"
          value={`${summary.totalHours}h`}
          color="blue"
        />
        <SummaryCard
          icon={Briefcase}
          label="Zile muncă"
          value={summary.count.MUNCA}
          color="blue"
        />
        <SummaryCard
          icon={Plane}
          label="Zile concediu"
          value={summary.count.CONCEDIU}
          color="green"
        />
        <SummaryCard
          icon={Calendar}
          label="Zile weekend"
          value={summary.count.WEEKEND}
          color="gray"
        />
        <SummaryCard
          icon={XCircle}
          label="Zile absent"
          value={summary.count.ABSENT}
          color="red"
        />
      </div>

      {/* Tabelul propriu-zis */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3 w-[180px]">
                  Data
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3 w-[180px]">
                  Activitate
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3 w-[110px]">
                  Check-in
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3 w-[110px]">
                  Check-out
                </th>
                <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3 w-[80px]">
                  Ore
                </th>
                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3">
                  Notă
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const config = ACTIVITY_CONFIG[row.activity] || ACTIVITY_CONFIG.MUNCA;
                const isDirty = dirtyDates.has(row.date);
                const isEditable = canEdit;
                const isDayLocked = row.isLocked; // WEEKEND, CONCEDIU, SARBATOARE, ABSENT
                const dateObj = parseISODate(row.date);
                const dayNum = dateObj.getDate();
                const isSunday = dateObj.getDay() === 0;
                const isSaturday = dateObj.getDay() === 6;

                return (
                  <tr
                    key={row.date}
                    className={`
                      border-b border-gray-100 transition
                      ${isDirty ? 'bg-yellow-50' : config.bg}
                      ${isSunday || isSaturday ? 'text-gray-500' : ''}
                    `}
                  >
                    {/* Coloana Data */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {String(dayNum).padStart(2, '0')}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {row.dayName}
                        </span>
                      </div>
                    </td>

                    {/* Coloana Activitate */}
                    <td className="px-4 py-2.5">
                      {isEditable ? (
                        <select
                          value={row.activity}
                          onChange={(e) => updateRow(row.date, { activity: e.target.value })}
                          className={`
                            text-sm rounded-md px-2 py-1 border border-gray-300
                            focus:outline-none focus:ring-2 focus:ring-primary-500
                            ${config.badge} ${config.text} font-medium
                          `}
                        >
                          {ACTIVITY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {ACTIVITY_CONFIG[opt].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.badge} ${config.text}`}>
                          <config.icon size={12} />
                          {config.label}
                        </span>
                      )}
                    </td>

                    {/* Coloana Check-in */}
                    <td className="px-4 py-2.5">
                      <input
                        type="time"
                        value={row.checkIn || ''}
                        onChange={(e) => updateRow(row.date, { checkIn: e.target.value || null })}
                        disabled={!isEditable || isDayLocked}
                        className="text-sm rounded-md px-2 py-1 border border-gray-300 w-full min-w-[130px] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>

                    {/* Coloana Check-out */}
                    <td className="px-4 py-2.5">
                      <input
                        type="time"
                        value={row.checkOut || ''}
                        onChange={(e) => updateRow(row.date, { checkOut: e.target.value || null })}
                        disabled={!isEditable || isDayLocked}
                        className="text-sm rounded-md px-2 py-1 border border-gray-300 w-full min-w-[130px] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>

                    {/* Coloana Ore (calculat automat) */}
                    <td className="px-4 py-2.5 text-center">
                      {row.hoursWorked !== null && row.hoursWorked !== undefined ? (
                        <span className="text-sm font-semibold text-gray-900">
                          {row.hoursWorked}h
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Coloana Notă */}
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={row.note || ''}
                        onChange={(e) => updateRow(row.date, { note: e.target.value || null })}
                        disabled={!isEditable}
                        maxLength={100}
                        placeholder={isEditable ? 'Opțional...' : ''}
                        className="text-sm rounded-md px-2 py-1 border border-gray-300 w-full disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Buton Salvează (duplicat jos pentru UX pe tabele lungi) */}
      {canEdit && dirtyDates.size > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSaveAll} loading={saving}>
            <Save size={18} />
            Salvează toate ({dirtyDates.size})
          </Button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// SummaryCard — card mic pentru sumarul de sus
// -------------------------------------------------------------------
function SummaryCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    gray:   'bg-gray-50 text-gray-600 border-gray-200',
    red:    'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <div className="flex items-center gap-2">
        <Icon size={16} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium opacity-70 truncate">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}