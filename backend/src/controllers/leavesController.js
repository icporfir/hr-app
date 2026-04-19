// =====================================================================
// LEAVES Controller — cereri de concediu
// Flux:
//  1. Angajat depune cerere → status IN_ASTEPTARE, notificare către manager
//  2. Manager aprobă/respinge → notificare către angajat
//  3. La aprobare, scade vacationDaysLeft dacă e tip ODIHNA
//
// Include și:
//  - exportLeaves: export Excel (.xlsx) cu toate cererile filtrate
//  - getCalendar:  concedii aprobate pentru calendarul vizual
// =====================================================================

import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { calculateWorkDays, datesOverlap } from '../utils/dateHelpers.js';
import ExcelJS from 'exceljs';

/**
 * POST /api/leaves
 * Angajatul depune o cerere de concediu
 * Body: { leaveType, startDate, endDate, reason }
 */
export const createLeaveRequest = asyncHandler(async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;
  const { employeeId } = req.user;

  if (!employeeId) {
    return res.status(403).json({
      success: false,
      message: 'Contul tău nu este asociat unui angajat.',
    });
  }

  // Validări input
  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Câmpuri obligatorii: leaveType, startDate, endDate.',
    });
  }

  const validTypes = ['ODIHNA', 'MEDICAL', 'FARA_PLATA', 'MATERNITATE', 'EVENIMENT'];
  if (!validTypes.includes(leaveType)) {
    return res.status(400).json({
      success: false,
      message: `Tip de concediu invalid. Valori permise: ${validTypes.join(', ')}.`,
    });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ success: false, message: 'Date invalide.' });
  }

  if (end < start) {
    return res.status(400).json({
      success: false,
      message: 'Data de sfârșit trebuie să fie după data de început.',
    });
  }

  // Calcul automat zile lucrătoare
  const daysCount = calculateWorkDays(start, end);
  if (daysCount === 0) {
    return res.status(400).json({
      success: false,
      message: 'Intervalul selectat nu conține zile lucrătoare.',
    });
  }

  // Preluăm angajatul pentru a verifica soldul
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { vacationDaysLeft: true, managerId: true },
  });

  // Verificare sold (doar pentru concediu de odihnă)
  if (leaveType === 'ODIHNA' && daysCount > employee.vacationDaysLeft) {
    return res.status(400).json({
      success: false,
      message: `Nu ai suficiente zile de concediu. Disponibile: ${employee.vacationDaysLeft}, solicitate: ${daysCount}.`,
    });
  }

  // Verificare suprapunere cu alte cereri (non-respinse, non-anulate)
  const existingLeaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: { in: ['IN_ASTEPTARE', 'APROBATA'] },
    },
  });

  const hasOverlap = existingLeaves.some((lr) =>
    datesOverlap(start, end, lr.startDate, lr.endDate)
  );

  if (hasOverlap) {
    return res.status(409).json({
      success: false,
      message: 'Ai deja o cerere activă care se suprapune cu perioada selectată.',
    });
  }

  // Creăm cererea
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      daysCount,
      reason: reason || null,
      status: 'IN_ASTEPTARE',
    },
    include: {
      employee: {
        select: { firstName: true, lastName: true, managerId: true },
      },
    },
  });

  // Notificare către manager (dacă există)
  if (employee.managerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: employee.managerId },
      select: { userId: true },
    });

    if (manager?.userId) {
      await prisma.notification.create({
        data: {
          userId: manager.userId,
          title: 'Cerere nouă de concediu',
          message: `${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName} a depus o cerere de ${leaveType.toLowerCase()} pentru ${daysCount} zile.`,
          link: `/concedii`,
        },
      });
    }
  }

  res.status(201).json({
    success: true,
    message: 'Cerere de concediu depusă cu succes.',
    data: leaveRequest,
  });
});

/**
 * GET /api/leaves
 * Listă cereri — filtrată după rol
 */
export const getLeaveRequests = asyncHandler(async (req, res) => {
  const { role, employeeId } = req.user;
  const { status, employeeId: filterEmp } = req.query;

  let where = {};

  if (role === 'ANGAJAT') {
    where.employeeId = employeeId;
  } else if (role === 'MANAGER') {
    // Cereri proprii + ale subordonaților
    where = {
      OR: [
        { employeeId },
        { employee: { managerId: employeeId } },
      ],
    };
  }
  // ADMIN_HR: fără filtru

  if (status) where.status = status;
  if (filterEmp && role === 'ADMIN_HR') where.employeeId = parseInt(filterEmp, 10);

  const leaves = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, count: leaves.length, data: leaves });
});

/**
 * GET /api/leaves/:id
 */
export const getLeaveById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role, employeeId } = req.user;

  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: {
        include: {
          department: true,
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!leave) {
    return res.status(404).json({ success: false, message: 'Cerere negăsită.' });
  }

  // Verificare acces
  if (role === 'ANGAJAT' && leave.employeeId !== employeeId) {
    return res.status(403).json({ success: false, message: 'Acces interzis.' });
  }
  if (
    role === 'MANAGER' &&
    leave.employeeId !== employeeId &&
    leave.employee.managerId !== employeeId
  ) {
    return res.status(403).json({ success: false, message: 'Acces interzis.' });
  }

  res.json({ success: true, data: leave });
});

/**
 * PUT /api/leaves/:id/approve
 * Doar MANAGER (pentru subordonați) sau ADMIN_HR
 */
export const approveLeave = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role, employeeId } = req.user;

  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!leave) {
    return res.status(404).json({ success: false, message: 'Cerere negăsită.' });
  }

  if (leave.status !== 'IN_ASTEPTARE') {
    return res.status(400).json({
      success: false,
      message: `Cererea este deja ${leave.status}.`,
    });
  }

  // Verificare drepturi
  if (role === 'MANAGER' && leave.employee.managerId !== employeeId) {
    return res.status(403).json({
      success: false,
      message: 'Nu poți aproba cereri ale altor angajați.',
    });
  }
  if (role === 'ANGAJAT') {
    return res.status(403).json({ success: false, message: 'Acces interzis.' });
  }

  // Tranzacție: aprobăm cererea + scădem soldul + notificăm angajatul
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: 'APROBATA',
        reviewedBy: employeeId,
        reviewedAt: new Date(),
      },
    });

    // Scădem soldul doar pentru concediu de odihnă
    if (leave.leaveType === 'ODIHNA') {
      await tx.employee.update({
        where: { id: leave.employeeId },
        data: {
          vacationDaysLeft: { decrement: leave.daysCount },
        },
      });
    }

    // Notificare către angajat
    await tx.notification.create({
      data: {
        userId: leave.employee.userId,
        title: 'Cerere de concediu aprobată',
        message: `Cererea ta de ${leave.leaveType.toLowerCase()} (${leave.daysCount} zile) a fost aprobată.`,
        link: `/concedii`,
      },
    });

    return updated;
  });

  res.json({
    success: true,
    message: 'Cerere aprobată cu succes.',
    data: result,
  });
});

/**
 * PUT /api/leaves/:id/reject
 * Body: { reviewNote } — motivul respingerii (opțional)
 */
export const rejectLeave = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role, employeeId } = req.user;
  const { reviewNote } = req.body;

  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!leave) {
    return res.status(404).json({ success: false, message: 'Cerere negăsită.' });
  }

  if (leave.status !== 'IN_ASTEPTARE') {
    return res.status(400).json({
      success: false,
      message: `Cererea este deja ${leave.status}.`,
    });
  }

  if (role === 'MANAGER' && leave.employee.managerId !== employeeId) {
    return res.status(403).json({
      success: false,
      message: 'Nu poți respinge cereri ale altor angajați.',
    });
  }
  if (role === 'ANGAJAT') {
    return res.status(403).json({ success: false, message: 'Acces interzis.' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: 'RESPINSA',
        reviewedBy: employeeId,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        userId: leave.employee.userId,
        title: 'Cerere de concediu respinsă',
        message: reviewNote
          ? `Cererea ta a fost respinsă. Motiv: ${reviewNote}`
          : 'Cererea ta de concediu a fost respinsă.',
        link: `/concedii`,
      },
    });

    return u;
  });

  res.json({ success: true, message: 'Cerere respinsă.', data: updated });
});

/**
 * PUT /api/leaves/:id/cancel
 * Angajatul își anulează propria cerere (doar dacă e IN_ASTEPTARE)
 */
export const cancelLeave = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { employeeId } = req.user;

  const leave = await prisma.leaveRequest.findUnique({ where: { id } });

  if (!leave) {
    return res.status(404).json({ success: false, message: 'Cerere negăsită.' });
  }
  if (leave.employeeId !== employeeId) {
    return res.status(403).json({ success: false, message: 'Nu poți anula cererea altcuiva.' });
  }
  if (leave.status !== 'IN_ASTEPTARE') {
    return res.status(400).json({
      success: false,
      message: 'Doar cererile în așteptare pot fi anulate.',
    });
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: 'ANULATA' },
  });

  res.json({ success: true, message: 'Cerere anulată.', data: updated });
});

// =====================================================================
// Etichete prietenoase pentru Excel și calendar
// =====================================================================

const LEAVE_TYPE_LABEL = {
  ODIHNA:                  'Odihnă',
  MEDICAL:                 'Medical',
  FARA_PLATA:              'Fără plată',
  MATERNITATE_PATERNITATE: 'Maternitate/Paternitate',
  STUDII:                  'Studii',
  // Fallback pentru tipuri vechi din seed
  MATERNITATE:             'Maternitate',
  EVENIMENT:               'Eveniment',
};

const STATUS_LABEL = {
  IN_ASTEPTARE: 'În așteptare',
  APROBATA:     'Aprobată',
  RESPINSA:     'Respinsă',
  ANULATA:      'Anulată',
};

/**
 * Formatare dată în stil românesc: DD.MM.YYYY
 */
const formatDateRo = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

// =====================================================================
// GET /api/leaves/export
// Generează fișier Excel (.xlsx) cu cererile de concediu.
// Query params opționale: ?status=APROBATA&startDate=2026-01-01&endDate=2026-12-31
//
// Filtrare pe rol:
//   - ADMIN_HR : toate cererile
//   - MANAGER  : cererile subordonaților (employee.managerId = employeeId propriu)
// =====================================================================

export const exportLeaves = asyncHandler(async (req, res) => {
  const { status, startDate, endDate } = req.query;
  const { role, employeeId } = req.user;

  // --- 1. Construim filtrul Prisma ---
  const where = {};

  if (role === 'MANAGER') {
    // Manager-ul vede cererile subordonaților săi
    where.employee = { managerId: employeeId };
  }
  // ADMIN_HR — fără filtru pe angajați

  if (status) where.status = status;

  if (startDate || endDate) {
    where.AND = [];
    if (startDate) where.AND.push({ endDate:   { gte: new Date(startDate) } });
    if (endDate)   where.AND.push({ startDate: { lte: new Date(endDate) } });
  }

  // --- 2. Aducem cererile din DB ---
  const leaves = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: { include: { department: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Recenzentul e stocat ca Int (employeeId) → lookup separat
  const reviewerIds = [...new Set(leaves.map((l) => l.reviewedBy).filter(Boolean))];
  const reviewers = reviewerIds.length
    ? await prisma.employee.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const reviewerMap = Object.fromEntries(
    reviewers.map((r) => [r.id, `${r.firstName} ${r.lastName}`])
  );

  // --- 3. Construim workbook-ul ---
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HR Solution';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Cereri concediu', {
    views: [{ state: 'frozen', ySplit: 1 }], // Header fix la scroll
  });

  sheet.columns = [
    { header: 'Nr.',              key: 'nr',         width: 6  },
    { header: 'Angajat',          key: 'employee',   width: 28 },
    { header: 'Departament',      key: 'dept',       width: 18 },
    { header: 'Tip concediu',     key: 'type',       width: 22 },
    { header: 'De la',            key: 'startDate',  width: 12 },
    { header: 'Până la',          key: 'endDate',    width: 12 },
    { header: 'Zile lucrătoare',  key: 'days',       width: 14 },
    { header: 'Motiv',            key: 'reason',     width: 35 },
    { header: 'Status',           key: 'status',     width: 14 },
    { header: 'Decis de',         key: 'reviewer',   width: 24 },
    { header: 'Data deciziei',    key: 'reviewedAt', width: 13 },
    { header: 'Motiv respingere', key: 'reviewNote', width: 35 },
  ];

  // --- 4. Stilizare header ---
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }, // Albastru HR Solution
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  // --- 5. Populare rânduri ---
  leaves.forEach((leave, idx) => {
    const row = sheet.addRow({
      nr:         idx + 1,
      employee:   `${leave.employee.firstName} ${leave.employee.lastName}`,
      dept:       leave.employee.department?.name || '—',
      type:       LEAVE_TYPE_LABEL[leave.leaveType] || leave.leaveType,
      startDate:  formatDateRo(leave.startDate),
      endDate:    formatDateRo(leave.endDate),
      days:       leave.daysCount,
      reason:     leave.reason || '—',
      status:     STATUS_LABEL[leave.status] || leave.status,
      reviewer:   leave.reviewedBy ? (reviewerMap[leave.reviewedBy] || '—') : '—',
      reviewedAt: formatDateRo(leave.reviewedAt),
      reviewNote: leave.reviewNote || '—',
    });

    // Colorare celulă status (semafor vizual)
    const statusCell = row.getCell('status');
    const colors = {
      'Aprobată':     { fg: 'FFDCFCE7', text: 'FF166534' },
      'În așteptare': { fg: 'FFFEF3C7', text: 'FF92400E' },
      'Respinsă':     { fg: 'FFFEE2E2', text: 'FF991B1B' },
      'Anulată':      { fg: 'FFF3F4F6', text: 'FF374151' },
    };
    const color = colors[statusCell.value];
    if (color) {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.fg } };
      statusCell.font = { color: { argb: color.text }, bold: true };
    }

    // Aliniere centrată pentru coloane scurte
    ['nr', 'days', 'status', 'startDate', 'endDate', 'reviewedAt'].forEach((k) => {
      row.getCell(k).alignment = { horizontal: 'center' };
    });
  });

  // Auto-filter pe header
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: sheet.columns.length },
  };

  // --- 6. Trimitere fișier către client ---
  const fileName = `cereri_concediu_${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  await workbook.xlsx.write(res);
  res.end();
});

// =====================================================================
// GET /api/leaves/calendar?month=YYYY-MM
// Returnează concediile APROBATE care se suprapun cu luna afișată.
//
// Filtrare pe rol:
//   - ADMIN_HR + MANAGER : toate concediile aprobate (overview general)
//   - ANGAJAT            : colegii cu același manager + cererile proprii
// =====================================================================

export const getCalendar = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const { role, employeeId } = req.user;

  // --- 1. Determinăm intervalul lunii afișate ---
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
  const monthEnd   = new Date(year, monthIndex + 1, 0, 23, 59, 59);

  // --- 2. Construim filtrul pe rol ---
  // Condiție suprapunere interval: startDate <= monthEnd ȘI endDate >= monthStart
  const where = {
    status: 'APROBATA',
    AND: [
      { startDate: { lte: monthEnd } },
      { endDate:   { gte: monthStart } },
    ],
  };

  if (role === 'ANGAJAT') {
    // Angajatul vede colegii din echipa sa + cererile proprii
    const me = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { managerId: true },
    });

    if (me?.managerId) {
      where.OR = [
        { employee: { managerId: me.managerId } },
        { employeeId: employeeId },
      ];
    } else {
      // Nu are manager → doar ale sale
      where.employeeId = employeeId;
    }
  }
  // ADMIN_HR + MANAGER → fără restricție suplimentară

  // --- 3. Query DB ---
  const leaves = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { startDate: 'asc' },
  });

  // --- 4. Normalizare pentru frontend ---
  const data = leaves.map((l) => ({
    id:           l.id,
    employeeId:   l.employee.id,
    employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
    department:   l.employee.department?.name || '—',
    leaveType:    l.leaveType,
    startDate:    l.startDate.toISOString().slice(0, 10),
    endDate:      l.endDate.toISOString().slice(0, 10),
    daysCount:    l.daysCount,
    reason:       l.reason,
  }));

  res.json({
    success: true,
    month:   `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    count:   data.length,
    data,
  });
});