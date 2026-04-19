// =====================================================================
// STATISTICS Controller — date agregate pentru Dashboard
// =====================================================================

import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/statistics/overview
 * Cifre cheie pentru cardurile din Dashboard
 */
export const getOverview = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalEmployees,
    pendingLeaves,
    presentToday,
    openJobs,
  ] = await Promise.all([
    prisma.employee.count({
      where: { user: { isActive: true } },
    }),
    prisma.leaveRequest.count({ where: { status: 'IN_ASTEPTARE' } }),
    prisma.attendance.count({ where: { date: today, checkIn: { not: null } } }),
    prisma.job.count({ where: { status: 'DESCHIS' } }),
  ]);

  res.json({
    success: true,
    data: { totalEmployees, pendingLeaves, presentToday, openJobs },
  });
});

/**
 * GET /api/statistics/attendance-trend?days=30
 * Număr angajați prezenți per zi pe ultimele N zile
 */
export const getAttendanceTrend = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const records = await prisma.attendance.groupBy({
    by: ['date'],
    where: { date: { gte: since }, checkIn: { not: null } },
    _count: { _all: true },
    orderBy: { date: 'asc' },
  });

  const data = records.map((r) => ({
    date: r.date.toISOString().split('T')[0],
    count: r._count._all,
  }));

  res.json({ success: true, data });
});

/**
 * GET /api/statistics/leaves-by-department
 * Număr cereri aprobate per departament în luna curentă
 */
export const getLeavesByDepartment = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APROBATA',
      startDate: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      employee: {
        include: { department: true },
      },
    },
  });

  // Grupăm manual pe departament (Prisma nu suportă groupBy pe relații imbricate)
  const map = new Map();
  for (const lr of leaves) {
    const deptName = lr.employee.department?.name || 'Fără departament';
    map.set(deptName, (map.get(deptName) || 0) + lr.daysCount);
  }

  const data = Array.from(map, ([department, days]) => ({ department, days }));
  res.json({ success: true, data });
});

/**
 * GET /api/statistics/employees-by-department
 * Distribuția angajaților pe departamente (pentru pie chart)
 */
export const getEmployeesByDepartment = asyncHandler(async (req, res) => {
  const departments = await prisma.department.findMany({
    include: {
      _count: {
        select: {
          employees: { where: { user: { isActive: true } } },
        },
      },
    },
  });

  const data = departments.map((d) => ({
    department: d.name,
    count: d._count.employees,
  }));

  res.json({ success: true, data });
});

/**
 * GET /api/statistics/hours-this-week
 * Total ore lucrate per angajat în săptămâna curentă
 */
export const getHoursThisWeek = asyncHandler(async (req, res) => {
  const now = new Date();
  const monday = new Date(now);
  const dayOfWeek = monday.getDay() || 7; // 1=luni, 7=duminică
  monday.setDate(monday.getDate() - dayOfWeek + 1);
  monday.setHours(0, 0, 0, 0);

  const records = await prisma.attendance.findMany({
    where: {
      date: { gte: monday },
      hoursWorked: { not: null },
    },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Însumăm orele per angajat
  const map = new Map();
  for (const r of records) {
    const key = r.employeeId;
    const name = `${r.employee.firstName} ${r.employee.lastName}`;
    const existing = map.get(key) || { name, hours: 0 };
    existing.hours += parseFloat(r.hoursWorked);
    map.set(key, existing);
  }

  const data = Array.from(map.values()).map((item) => ({
    ...item,
    hours: parseFloat(item.hours.toFixed(2)),
  }));

  res.json({ success: true, data });
});

// =====================================================================
// Ultimii N angajați adăugați (implicit 3) — pentru Dashboard
// Sortare descrescătoare după createdAt
// Acces: ADMIN_HR și MANAGER (convenție existentă pentru /api/statistics)
// =====================================================================

export const getRecentEmployees = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 3, 10); // max 10

  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      department: { select: { name: true } },
      user:       { select: { email: true, isActive: true } },
    },
  });

  // Normalizare — eliminăm câmpuri sensibile (ex: salary)
  const data = employees.map((e) => ({
    id:         e.id,
    firstName:  e.firstName,
    lastName:   e.lastName,
    position:   e.position,
    department: e.department?.name || '—',
    email:      e.user?.email,
    isActive:   e.user?.isActive !== false,
    createdAt:  e.createdAt,
  }));

  res.json({ success: true, data });
});