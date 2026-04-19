// =====================================================================
// LEAVES Controller — cereri de concediu
// Flux:
//  1. Angajat depune cerere → status IN_ASTEPTARE, notificare către manager
//  2. Manager aprobă/respinge → notificare către angajat
//  3. La aprobare, scade vacationDaysLeft dacă e tip ODIHNA
// =====================================================================

import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { calculateWorkDays, datesOverlap } from '../utils/dateHelpers.js';

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
          link: `/leaves/${leaveRequest.id}`,
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
        link: `/leaves/${id}`,
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
        link: `/leaves/${id}`,
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