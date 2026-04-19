// =====================================================================
// Calendar vizual custom pentru afișarea concediilor aprobate
//
// Construit from scratch cu Tailwind + Date API nativ (fără librării).
// Motiv: control total asupra UI + cod ușor de explicat în licență.
//
// Layout:
//   Header:  << luna 2026 >>   [Azi]
//   Legendă: [badge tipuri concediu]
//   Grid 7 coloane (Lu..Du) × 6 rânduri (zile din lună + cele de umplere)
//   Fiecare celulă: număr zi + max 3 badge-uri cu concedii + „+N alții"
//
// Interacțiune: click pe zi cu concedii → modal cu toate detaliile
// =====================================================================

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { leaveService } from '../../services/leaveService';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';

// Luni în limba română (0-indexed, corespunde cu Date.getMonth())
const MONTHS_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

// Inițialele zilelor săptămânii (începem cu Luni — standard european)
const WEEKDAYS_RO = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];

// Culoare fundal/text pentru badge în funcție de tipul concediului
const LEAVE_COLORS = {
  ODIHNA:                  { bg: 'bg-blue-100',  text: 'text-blue-800',  label: 'Odihnă' },
  MEDICAL:                 { bg: 'bg-red-100',   text: 'text-red-800',   label: 'Medical' },
  FARA_PLATA:              { bg: 'bg-gray-200',  text: 'text-gray-800',  label: 'Fără plată' },
  MATERNITATE_PATERNITATE: { bg: 'bg-pink-100',  text: 'text-pink-800',  label: 'Maternitate/Paternitate' },
  STUDII:                  { bg: 'bg-green-100', text: 'text-green-800', label: 'Studii' },
  // Fallback pentru tipuri vechi din seed
  MATERNITATE:             { bg: 'bg-pink-100',  text: 'text-pink-800',  label: 'Maternitate' },
  EVENIMENT:               { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Eveniment' },
};

/**
 * Convertește un string "YYYY-MM-DD" într-un Date la 00:00 local.
 * NU folosim new Date(string) direct pentru că JS îl interpretează ca UTC,
 * ceea ce în România (UTC+2/+3) poate decala ziua cu 1.
 */
const parseISODate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Compară 2 date doar pe an/lună/zi (ignoră ora) */
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Verifică dacă targetDate ∈ [startDate, endDate] (inclusive) */
const isDateInRange = (target, start, end) => {
  const t = target.getTime();
  return t >= start.getTime() && t <= end.getTime();
};

export default function LeaveCalendar() {
  // Luna afișată (inițial: luna curentă, ziua 1)
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null); // pentru modal

  // ------------------------------------------------------------------
  // Fetch concedii când se schimbă luna afișată
  // ------------------------------------------------------------------
  useEffect(() => {
    const monthStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

    // Funcție async internă — pattern recomandat de React pentru a evita
    // warning-ul "react-hooks/set-state-in-effect" și pentru a gestiona
    // corect race conditions (dacă luna se schimbă înainte să răspundă API-ul).
    const loadLeaves = async () => {
      setLoading(true);
      try {
        const data = await leaveService.calendar(monthStr);
        setLeaves(data);
      } catch {
        setLeaves([]);
      } finally {
        setLoading(false);
      }
    };

    loadLeaves();
  }, [viewDate]);

  // ------------------------------------------------------------------
  // Calcul matrice 7x6 celule pentru grid-ul calendarului
  // ------------------------------------------------------------------
  const calendarCells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // JS: getDay() returnează 0=Duminică, 1=Luni, ..., 6=Sâmbătă
    // Noi începem săptămâna cu Luni, deci trebuie să mapăm:
    // Duminică (0) → offset 6, Luni (1) → offset 0, ... Sâmbătă (6) → offset 5
    const jsDay = firstDayOfMonth.getDay();
    const offsetStart = jsDay === 0 ? 6 : jsDay - 1;

    const prevMonthDays = new Date(year, month, 0).getDate();
    const cells = [];

    // Zilele din luna anterioară (umplere primă săptămână)
    for (let i = offsetStart - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      cells.push({
        date:           new Date(year, month - 1, dayNum),
        dayNumber:      dayNum,
        isCurrentMonth: false,
      });
    }

    // Zilele din luna curentă
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date:           new Date(year, month, d),
        dayNumber:      d,
        isCurrentMonth: true,
      });
    }

    // Zilele din luna următoare (umplem până la 42 = 6 rânduri × 7 zile)
    let nextDay = 1;
    while (cells.length < 42) {
      cells.push({
        date:           new Date(year, month + 1, nextDay),
        dayNumber:      nextDay,
        isCurrentMonth: false,
      });
      nextDay++;
    }

    return cells;
  }, [viewDate]);

  // ------------------------------------------------------------------
  // Găsește concediile active într-o anumită zi
  // ------------------------------------------------------------------
  const getLeavesForDay = (date) => {
    return leaves.filter((l) => {
      const start = parseISODate(l.startDate);
      const end   = parseISODate(l.endDate);
      return isDateInRange(date, start, end);
    });
  };

  // ------------------------------------------------------------------
  // Handlere navigare lună
  // ------------------------------------------------------------------
  const goPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const goNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };
  const goToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const today = new Date();
  const selectedDayLeaves = selectedDay ? getLeavesForDay(selectedDay) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header cu navigare */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Luna anterioară"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 min-w-[160px] text-center">
            {MONTHS_RO[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h3>
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

      {/* Legendă tipuri concediu */}
      <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
        {/* Folosim doar tipurile principale în legendă (primele 5) */}
        {Object.entries(LEAVE_COLORS).slice(0, 5).map(([key, c]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span className={`w-3 h-3 rounded ${c.bg}`} />
            <span className="text-gray-600">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Header zilele săptămânii */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {WEEKDAYS_RO.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid zile */}
      {loading ? (
        <div className="py-16">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {calendarCells.map((cell, idx) => {
            const dayLeaves = cell.isCurrentMonth ? getLeavesForDay(cell.date) : [];
            const isToday = isSameDay(cell.date, today);
            const hasLeaves = dayLeaves.length > 0;

            return (
              <div
                key={idx}
                onClick={() => hasLeaves && setSelectedDay(cell.date)}
                className={`
                  min-h-[90px] p-1.5 border-b border-r border-gray-100 transition
                  ${!cell.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                  ${hasLeaves ? 'cursor-pointer hover:bg-blue-50' : ''}
                  ${isToday ? 'ring-2 ring-inset ring-primary-500' : ''}
                `}
              >
                {/* Număr zi */}
                <div className={`
                  text-sm font-medium mb-1
                  ${isToday ? 'text-primary-700 font-bold' : ''}
                  ${cell.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                `}>
                  {cell.dayNumber}
                </div>

                {/* Badge-uri concedii (max 3 vizibile) */}
                <div className="space-y-0.5">
                  {dayLeaves.slice(0, 3).map((leave) => {
                    const color = LEAVE_COLORS[leave.leaveType] || LEAVE_COLORS.ODIHNA;
                    return (
                      <div
                        key={leave.id}
                        className={`${color.bg} ${color.text} text-xs px-1.5 py-0.5 rounded truncate`}
                        title={`${leave.employeeName} — ${color.label}`}
                      >
                        {leave.employeeName.split(' ')[0]}
                      </div>
                    );
                  })}
                  {dayLeaves.length > 3 && (
                    <div className="text-xs text-gray-500 px-1.5">
                      +{dayLeaves.length - 3} alții
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalii zi selectată */}
      <Modal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={
          selectedDay
            ? `Concedii — ${selectedDay.getDate()} ${MONTHS_RO[selectedDay.getMonth()]} ${selectedDay.getFullYear()}`
            : ''
        }
      >
        <div className="space-y-3">
          {selectedDayLeaves.length === 0 ? (
            <p className="text-sm text-gray-500">Nicio cerere activă în această zi.</p>
          ) : (
            selectedDayLeaves.map((leave) => {
              const color = LEAVE_COLORS[leave.leaveType] || LEAVE_COLORS.ODIHNA;
              return (
                <div
                  key={leave.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {leave.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{leave.employeeName}</p>
                    <p className="text-xs text-gray-500">{leave.department}</p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={`${color.bg} ${color.text} text-xs px-2 py-0.5 rounded font-medium`}>
                        {color.label}
                      </span>
                      <span className="text-xs text-gray-600">
                        {leave.startDate} → {leave.endDate} ({leave.daysCount} zile)
                      </span>
                    </div>
                    {leave.reason && (
                      <p className="text-xs text-gray-600 mt-1 italic">„{leave.reason}"</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
}