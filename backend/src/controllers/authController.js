// =====================================================================
// AUTH Controller — login, logout, profil curent
// =====================================================================

import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Răspuns: { success, token, user }
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validare input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email și parolă sunt obligatorii.',
    });
  }

  // Căutăm user-ul după email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      employee: {
        include: { department: true },
      },
    },
  });

  // Mesaj generic pentru a nu dezvălui dacă email-ul există sau nu
  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Email sau parolă incorecte.',
    });
  }

  // Verificăm parola
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: 'Email sau parolă incorecte.',
    });
  }

  // Generăm token-ul JWT
  const token = generateToken({
    userId: user.id,
    role: user.role,
    employeeId: user.employee?.id || null,
  });

  // Răspundem cu token + date user (FĂRĂ passwordHash)
  res.json({
    success: true,
    message: 'Autentificare reușită.',
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employee: user.employee
        ? {
            id: user.employee.id,
            firstName: user.employee.firstName,
            lastName: user.employee.lastName,
            position: user.employee.position,
            department: user.employee.department?.name || null,
          }
        : null,
    },
  });
});

/**
 * POST /api/auth/logout
 * În JWT pur, logout-ul se face pe client (șterge token-ul din localStorage).
 * Aici răspundem doar cu confirmare. Pe viitor putem implementa blacklist.
 */
export const logout = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Delogare reușită.',
  });
});

/**
 * GET /api/auth/me
 * Răspuns: datele user-ului curent (de la token)
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: {
      employee: {
        include: {
          department: true,
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Utilizator negăsit.',
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      employee: user.employee
        ? {
            id: user.employee.id,
            firstName: user.employee.firstName,
            lastName: user.employee.lastName,
            position: user.employee.position,
            phone: user.employee.phone,
            hireDate: user.employee.hireDate,
            vacationDaysLeft: user.employee.vacationDaysLeft,
            department: user.employee.department,
            manager: user.employee.manager,
          }
        : null,
    },
  });
});