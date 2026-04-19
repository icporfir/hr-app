// =====================================================================
// ATTENDANCE Controller — pontaj zilnic (check-in / check-out)
// Un singur pontaj per angajat per zi (enforced prin @@unique([employeeId, date]))
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