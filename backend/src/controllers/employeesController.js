// =====================================================================
// EMPLOYEES Controller — CRUD angajați
// Reguli de acces:
//  - ADMIN_HR poate face tot
//  - MANAGER vede doar subordonații săi
//  - ANGAJAT vede doar propriul profil
// =====================================================================

import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/employees
 * Listă angajați — filtrat după rol
 */
export const getEmployees = asyncHandler(async (req, res) => {
  const { role, employeeId } = req.user;

  let where = {};

  if (role === 'MANAGER') {
    // Managerul vede doar subordonații săi (sau pe el însuși)
    where = {
      OR: [
        { managerId: employeeId },
        { id: employeeId },
      ],
    };
  } else if (role === 'ANGAJAT') {
    // Angajatul obișnuit vede doar profilul propriu
    where = { id: employeeId };
  }
  // ADMIN_HR: fără filtru, vede tot

  const employees = await prisma.employee.findMany({
    where,
    include: {
      department: true,
      user: { select: { email: true, role: true, isActive: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { lastName: 'asc' },
  });

  // Ascundem salariul pentru non-ADMIN_HR
  const sanitized = employees.map((emp) => ({
    ...emp,
    salary: role === 'ADMIN_HR' ? emp.salary : null,
  }));

  res.json({
    success: true,
    count: sanitized.length,
    data: sanitized,
  });
});

/**
 * GET /api/employees/:id
 */
export const getEmployeeById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role, employeeId } = req.user;

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      user: { select: { email: true, role: true, isActive: true } },
      manager: { select: { id: true, firstName: true, lastName: true } },
      subordinates: { select: { id: true, firstName: true, lastName: true, position: true } },
    },
  });

  if (!employee) {
    return res.status(404).json({ success: false, message: 'Angajat negăsit.' });
  }

  // Verificare acces
  if (role === 'ANGAJAT' && employee.id !== employeeId) {
    return res.status(403).json({ success: false, message: 'Acces interzis.' });
  }
  if (role === 'MANAGER' && employee.id !== employeeId && employee.managerId !== employeeId) {
    return res.status(403).json({ success: false, message: 'Acces interzis.' });
  }

  // Ascundem salariul pentru non-ADMIN_HR
  if (role !== 'ADMIN_HR') {
    employee.salary = null;
  }

  res.json({ success: true, data: employee });
});

/**
 * POST /api/employees
 * Doar ADMIN_HR
 * Body: { email, password, role, firstName, lastName, position, departmentId, ... }
 */
export const createEmployee = asyncHandler(async (req, res) => {
  const {
    email, password, role = 'ANGAJAT',
    firstName, lastName, cnp, phone, address, birthDate,
    position, departmentId, managerId,
    hireDate, salary, vacationDaysLeft,
  } = req.body;

  // Validări
  if (!email || !password || !firstName || !lastName || !position) {
    return res.status(400).json({
      success: false,
      message: 'Câmpuri obligatorii: email, password, firstName, lastName, position.',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Parola trebuie să aibă minim 8 caractere.',
    });
  }

  // Verificare email duplicat
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email deja folosit.' });
  }

  // Criptăm parola
  const passwordHash = await bcrypt.hash(password, 10);

  // Creăm User + Employee într-o tranzacție implicită (nested create)
  const newUser = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      role,
      employee: {
        create: {
          firstName,
          lastName,
          cnp: cnp || null,
          phone: phone || null,
          address: address || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          position,
          departmentId: departmentId ? parseInt(departmentId, 10) : null,
          managerId: managerId ? parseInt(managerId, 10) : null,
          hireDate: hireDate ? new Date(hireDate) : new Date(),
          salary: salary ? parseFloat(salary) : null,
          vacationDaysLeft: vacationDaysLeft ?? 21,
        },
      },
    },
    include: {
      employee: {
        include: { department: true },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Angajat creat cu succes.',
    data: {
      id: newUser.employee.id,
      email: newUser.email,
      role: newUser.role,
      employee: newUser.employee,
    },
  });
});

/**
 * PUT /api/employees/:id
 * Actualizare date angajat
 */
export const updateEmployee = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role, employeeId } = req.user;

  // Doar ADMIN_HR poate actualiza orice angajat
  // ANGAJAT poate actualiza doar date proprii limitate (phone, address)
  const isOwnProfile = employeeId === id;

  if (role !== 'ADMIN_HR' && !isOwnProfile) {
    return res.status(403).json({ success: false, message: 'Acces interzis.' });
  }

  const allowedForSelf = ['phone', 'address'];
  const allowedForAdmin = [
    'firstName', 'lastName', 'cnp', 'phone', 'address', 'birthDate',
    'position', 'departmentId', 'managerId', 'hireDate', 'salary', 'vacationDaysLeft',
  ];

  const allowed = role === 'ADMIN_HR' ? allowedForAdmin : allowedForSelf;

  // Construim obiectul de update doar cu câmpurile permise
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (['birthDate', 'hireDate'].includes(key)) {
        data[key] = req.body[key] ? new Date(req.body[key]) : null;
      } else if (['departmentId', 'managerId', 'vacationDaysLeft'].includes(key)) {
        data[key] = req.body[key] !== null ? parseInt(req.body[key], 10) : null;
      } else if (key === 'salary') {
        data[key] = req.body[key] !== null ? parseFloat(req.body[key]) : null;
      } else {
        data[key] = req.body[key];
      }
    }
  }

  const updated = await prisma.employee.update({
    where: { id },
    data,
    include: { department: true, user: { select: { email: true, role: true } } },
  });

  res.json({
    success: true,
    message: 'Angajat actualizat cu succes.',
    data: updated,
  });
});

/**
 * DELETE /api/employees/:id
 * Doar ADMIN_HR — dezactivează contul (soft delete)
 */
export const deleteEmployee = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!employee) {
    return res.status(404).json({ success: false, message: 'Angajat negăsit.' });
  }

  // Soft delete — dezactivăm contul de user (păstrăm istoricul)
  await prisma.user.update({
    where: { id: employee.userId },
    data: { isActive: false },
  });

  res.json({
    success: true,
    message: 'Cont dezactivat cu succes. Istoricul angajatului a fost păstrat.',
  });
});

/**
 * GET /api/employees/departments/list
 * Lista departamentelor — util pentru dropdown-uri în formulare
 */
export const getDepartments = asyncHandler(async (req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { employees: true } } },
  });

  res.json({ success: true, data: departments });
});