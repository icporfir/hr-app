// =====================================================================
// ATTENDANCE Controller — pontaj zilnic (check-in / check-out)
// Un singur pontaj per angajat per zi (enforced prin @@unique([employeeId, date]))
//
// Include 2 moduri de lucru:
//  1. Clasic (check-in / check-out) — păstrat pentru retro-compatibilitate
//  2. Stil tabel lunar (monthly + bulk save) — Prompt 6+7
// =====================================================================

import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Normalizează un Date la miezul nopții (00:00:00)
 */
const normalizeDate = (d = new Date()) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

/**
 * POST /api/attendance/check-in
 * Marchează sosirea angajatului azi
 */
export const checkIn = asyncHandler(async (req, res) => {
  const { employeeId } = req.user;

  if (!employeeId) {
    return res.status(403).json({ success: false, message: 'Nu ai profil de angajat.' });
  }

  const today = normalizeDate();
  const now = new Date();

  // Verificăm dacă există deja un pontaj pentru azi
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Ai făcut deja check-in astăzi.',
      data: existing,
    });
  }

  const attendance = await prisma.attendance.create({
    data: {
      employeeId,
      date: today,
      checkIn: now,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Check-in înregistrat.',
    data: attendance,
  });
});

/**
 * POST /api/attendance/check-out
 * Marchează plecarea și calculează orele lucrate
 */
export const checkOut = asyncHandler(async (req, res) => {
  const { employeeId } = req.user;
  const today = normalizeDate();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Nu ai check-in pentru astăzi. Fă mai întâi check-in.',
    });
  }

  if (existing.checkOut) {
    return res.status(409).json({
      success: false,
      message: 'Ai făcut deja check-out astăzi.',
      data: existing,
    });
  }

  // Calculăm orele lucrate
  const hoursWorked = ((now - existing.checkIn) / (1000 * 60 * 60)).toFixed(2);

  const updated = await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      checkOut: now,
      hoursWorked: parseFloat(hoursWorked),
    },
  });

  res.json({
    success: true,
    message: 'Check-out înregistrat.',
    data: updated,
  });
});

/**
 * GET /api/attendance/me/today
 * Starea pontajului curent (pentru a afișa butonul potrivit în UI)
 */
export const getMyToday = asyncHandler(async (req, res) => {
  const { employeeId } = req.user;
  const today = normalizeDate();

  const record = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  res.json({
    success: true,
    data: record,
    status: !record ? 'NOT_STARTED' : !record.checkOut ? 'CHECKED_IN' : 'COMPLETED',
  });
});

/**
 * GET /api/attendance/employee/:employeeId
 * Istoricul pontajelor unui angajat (filtrabil după interval)
 */
export const getByEmployee = asyncHandler(async (req, res) => {
  const targetEmployeeId = parseInt(req.params.employeeId, 10);
  const { role, employeeId } = req.user;
  const { from, to } = req.query;

  // Verificare acces
  if (role === 'ANGAJAT' && targetEmployeeId !== employeeId) {
    return res.status(403).json({ success: false, message: 'Acces interzis.' });
  }
  if (role === 'MANAGER' && targetEmployeeId !== employeeId) {
    const target = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { managerId: true },
    });
    if (!target || target.managerId !== employeeId) {
      return res.status(403).json({ success: false, message: 'Acces interzis.' });
    }
  }

  const where = { employeeId: targetEmployeeId };
  if (from) where.date = { ...where.date, gte: new Date(from) };
  if (to) where.date = { ...where.date, lte: new Date(to) };

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 100, // limită pentru evitarea payload-urilor enorme
  });

  res.json({ success: true, count: records.length, data: records });
});

// =====================================================================
// PONTAJ LUNAR (Prompt 6+7) — tabel stil "foaie de pontaj"
// =====================================================================

// Nume zile săptămână în română (0 = Duminică, 6 = Sâmbătă)
const WEEKDAYS_RO = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];

/**
 * Formatează un Date ca "HH:MM" (ora în timezone local)
 */
const formatTimeHM = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Parse "HH:MM" + data de bază → obiect Date în timezone local
 */
const parseTimeHM = (hm, baseDate) => {
  if (!hm || !hm.match(/^\d{2}:\d{2}$/)) return null;
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
};

/**
 * Calcul ore lucrate între 2 ore HH:MM (acceptă checkOut după miezul nopții)
 */
const calcHours = (inHM, outHM) => {
  if (!inHM || !outHM) return null;
  const [ih, im] = inHM.split(':').map(Number);
  const [oh, om] = outHM.split(':').map(Number);
  let diff = (oh * 60 + om) - (ih * 60 + im);
  if (diff < 0) diff += 24 * 60; // peste miezul nopții
  return parseFloat((diff / 60).toFixed(2));
};

/**
 * GET /api/attendance/monthly?month=YYYY-MM&employeeId=X
 * Returnează toate zilele lunii pentru un angajat (pre-populate cu WEEKEND/CONCEDIU unde e cazul)
 *
 * Reguli rol (conform deciziilor Prompt 6+7):
 *  - ANGAJAT: doar propriul pontaj (ignoră query.employeeId)
 *  - MANAGER: pontajul subordonaților (read-only — editare blocată pe frontend)
 *  - ADMIN_HR: pontajul oricui
 */
export const getMonthlyAttendance = asyncHandler(async (req, res) => {
  const { month, employeeId: queryEmpId } = req.query;
  const { role, employeeId: currentEmpId } = req.user;

  // --- 1. Determinăm employeeId-ul pentru care cerem datele ---
  let targetEmployeeId = currentEmpId;

  if (queryEmpId) {
    const parsed = parseInt(queryEmpId, 10);

    if (role === 'ANGAJAT') {
      // Ignoră tentativa de a vedea altcuiva — forțăm propriul ID
      targetEmployeeId = currentEmpId;
    } else if (role === 'MANAGER') {
      // Manager poate vedea subordonații săi sau pe el însuși
      if (parsed !== currentEmpId) {
        const sub = await prisma.employee.findUnique({
          where: { id: parsed },
          select: { managerId: true },
        });
        if (!sub || sub.managerId !== currentEmpId) {
          return res.status(403).json({ success: false, message: 'Acces interzis.' });
        }
      }
      targetEmployeeId = parsed;
    } else {
      // ADMIN_HR — acces nelimitat
      targetEmployeeId = parsed;
    }
  }

  if (!targetEmployeeId) {
    return res.status(400).json({ success: false, message: 'EmployeeId lipsă.' });
  }

  // --- 2. Determinăm intervalul lunii ---
  const now = new Date();
  let year, monthIndex;

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    year = y;
    monthIndex = m - 1;
  } else {
    year = now.getFullYear();
    monthIndex = now.getMonth();
  }

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // --- 3. Aducem pontajele existente din DB ---
  const existingRecords = await prisma.attendance.findMany({
    where: {
      employeeId: targetEmployeeId,
      date: { gte: monthStart, lte: monthEnd },
    },
    orderBy: { date: 'asc' },
  });

/**
 * Formatează un Date ca "YYYY-MM-DD" în timezone LOCAL (nu UTC).
 * Evităm toISOString() care convertește la UTC și poate decala ziua.
 */
const dateKeyLocal = (d) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const recordsByDate = {};
existingRecords.forEach((r) => {
  const key = dateKeyLocal(r.date);
  recordsByDate[key] = r;
});

  // --- 4. Aducem concediile aprobate care se suprapun cu luna ---
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId: targetEmployeeId,
      status: 'APROBATA',
      AND: [
        { startDate: { lte: monthEnd } },
        { endDate:   { gte: monthStart } },
      ],
    },
    select: { startDate: true, endDate: true },
  });

  /**
   * Helper: verifică dacă o zi e în interval de concediu
   */
  const isOnLeave = (date) => {
    return approvedLeaves.some((l) => {
      const s = new Date(l.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(l.endDate);   e.setHours(23, 59, 59, 999);
      return date >= s && date <= e;
    });
  };

  // --- 5. Construim response-ul: toate zilele lunii ---
  const data = [];
  let totalHours = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const currentDate = new Date(year, monthIndex, d);
    const dateKey = dateKeyLocal(currentDate);
    const dayOfWeek = currentDate.getDay(); // 0=Dum, 6=Sâm
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const existing = recordsByDate[dateKey];

    // Activitate default dacă nu există record
    let defaultActivity = 'MUNCA';
    if (isOnLeave(currentDate)) defaultActivity = 'CONCEDIU';
    else if (isWeekend)         defaultActivity = 'WEEKEND';

    const activity = existing?.activity || defaultActivity;
    const hoursWorked = existing?.hoursWorked ? Number(existing.hoursWorked) : null;

    if (hoursWorked && activity === 'MUNCA') totalHours += hoursWorked;

    data.push({
      date:        dateKey,
      dayName:     WEEKDAYS_RO[dayOfWeek],
      activity,
      checkIn:     formatTimeHM(existing?.checkIn),
      checkOut:    formatTimeHM(existing?.checkOut),
      hoursWorked,
      note:        existing?.note || null,
      // UI hint — zilele non-MUNCA sunt readonly (chiar și pentru angajat)
      isLocked:    activity !== 'MUNCA',
      existsInDb:  !!existing,
    });
  }

  res.json({
    success: true,
    month:         `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    employeeId:    targetEmployeeId,
    totalHours:    parseFloat(totalHours.toFixed(2)),
    daysInMonth,
    data,
  });
});

/**
 * PUT /api/attendance/bulk
 * Salvează / actualizează pontajul pentru mai multe zile deodată.
 *
 * ACCES: doar ANGAJAT (și doar pe propriul pontaj).
 * Manager și ADMIN_HR pot doar CITI (conform deciziei din Prompt 6+7).
 *
 * Body: { entries: [{ date, activity, checkIn, checkOut, note }, ...] }
 */
export const bulkSaveAttendance = asyncHandler(async (req, res) => {
  const { role, employeeId } = req.user;
  const { entries } = req.body;

  // --- 1. Validare acces ---
  if (role !== 'ANGAJAT') {
    // Manager/HR doar citesc pontajul altora — nu editează
    // (decizie Prompt 6+7: read-only pentru aceștia)
    return res.status(403).json({
      success: false,
      message: 'Doar angajații își pot edita propriul pontaj. Manager și HR au acces doar în citire.',
    });
  }

  if (!employeeId) {
    return res.status(403).json({ success: false, message: 'Nu ai profil de angajat.' });
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ success: false, message: 'Array-ul "entries" este gol sau invalid.' });
  }

  // --- 2. Procesare fiecare intrare ---
  let savedCount = 0;

  for (const entry of entries) {
    const { date, activity, checkIn: inHM, checkOut: outHM, note } = entry;

    // Skip intrări incomplete
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!activity) continue;

    // Parse data zilei (la miezul nopții local)
    const [y, m, d] = date.split('-').map(Number);
    const dayDate = new Date(y, m - 1, d);

    // Parse ore (folosim dayDate ca bază)
    const checkInDate  = parseTimeHM(inHM, dayDate);
    const checkOutDate = parseTimeHM(outHM, dayDate);
    const hours        = calcHours(inHM, outHM);

    // Upsert — creează dacă nu există, altfel update
    await prisma.attendance.upsert({
      where: {
        employeeId_date: { employeeId, date: dayDate },
      },
      create: {
        employeeId,
        date:        dayDate,
        activity,
        checkIn:     checkInDate,
        checkOut:    checkOutDate,
        hoursWorked: hours,
        note:        note || null,
      },
      update: {
        activity,
        checkIn:     checkInDate,
        checkOut:    checkOutDate,
        hoursWorked: hours,
        note:        note || null,
      },
    });

    savedCount++;
  }

  res.json({
    success: true,
    saved:   savedCount,
    message: `Pontaj salvat cu succes pentru ${savedCount} ${savedCount === 1 ? 'zi' : 'zile'}.`,
  });
});