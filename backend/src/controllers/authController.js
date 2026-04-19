// =====================================================================
// AuthController — autentificare cu access + refresh tokens
// =====================================================================

import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt.js';

/**
 * POST /api/auth/login
 * Body: { email, password, rememberMe? }
 * Returnează: { token (access), refreshToken, user }
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email și parolă sunt obligatorii.',
    });
  }

  // Căutăm user-ul împreună cu datele de angajat
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      employee: {
        include: { department: true },
      },
    },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Email sau parolă incorectă.',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Contul a fost dezactivat. Contactează administratorul.',
    });
  }

  // Verificăm parola cu bcrypt
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: 'Email sau parolă incorectă.',
    });
  }

  // Generăm access token (JWT, 15 min)
  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
    employeeId: user.employee?.id || null,
  });

  // Generăm refresh token (string random) și îl salvăm în DB
  const refreshToken = generateRefreshToken();
  const expiresAt = getRefreshTokenExpiry(rememberMe);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
      rememberMe,
    },
  });

  res.json({
    success: true,
    message: 'Autentificare reușită.',
    token: accessToken,
    refreshToken,
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
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Returnează: { token (access nou) }
 *
 * Dacă refresh token e valid și nu a expirat → returnează access token nou
 * Dacă nu e valid → 401, front-end va redirecta la /login
 */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token lipsă.',
    });
  }

  // Căutăm token-ul în DB
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: {
      user: {
        include: { employee: true },
      },
    },
  });

  if (!stored) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token invalid.',
    });
  }

  // Verificăm expirarea
  if (stored.expiresAt < new Date()) {
    // Curățăm token-ul expirat
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    return res.status(401).json({
      success: false,
      message: 'Refresh token expirat. Te rog să te autentifici din nou.',
    });
  }

  // Verificăm că user-ul e încă activ
  if (!stored.user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Contul a fost dezactivat.',
    });
  }

  // Generăm access token nou (refresh token rămâne același)
  const accessToken = generateAccessToken({
    userId: stored.user.id,
    role: stored.user.role,
    employeeId: stored.user.employee?.id || null,
  });

  res.json({
    success: true,
    token: accessToken,
  });
});

/**
 * POST /api/auth/logout
 * Body: { refreshToken? } — dacă trimite, șterge exact acel token
 * Altfel: șterge toate refresh tokens ale user-ului (logout din toate device-urile)
 */
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    // Șterge doar token-ul specific
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  } else if (req.user?.userId) {
    // Dacă e autentificat, șterge toate sesiunile sale
    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.userId },
    });
  }

  res.json({
    success: true,
    message: 'Delogare reușită.',
  });
});

/**
 * GET /api/auth/me
 * Returnează datele user-ului curent
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
            vacationDaysTotal: user.employee.vacationDaysTotal,
            vacationDaysLeft: user.employee.vacationDaysLeft,
            department: user.employee.department,
            manager: user.employee.manager,
          }
        : null,
    },
  });
});