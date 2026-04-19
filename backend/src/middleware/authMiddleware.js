// =====================================================================
// Middleware AUTH — verifică token JWT și rolul utilizatorului
// =====================================================================

import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/db.js';

/**
 * Verifică că în header există un token valid.
 * Dacă e valid, atașează req.user = { userId, role, employeeId }
 * Dacă nu, răspunde 401.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acces neautorizat. Token lipsă.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Decodăm și verificăm token-ul
    const decoded = verifyToken(token);

    // Verificăm că user-ul încă există și este activ
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { employee: { select: { id: true } } },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cont inactiv sau inexistent.',
      });
    }

    // Atașăm informațiile user-ului la request pentru controllere
    req.user = {
      userId: user.id,
      role: user.role,
      email: user.email,
      employeeId: user.employee?.id || null,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Sesiunea a expirat. Te rugăm să te autentifici din nou.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token invalid.',
    });
  }
};

/**
 * Middleware care verifică dacă user-ul are unul din rolurile permise.
 * Se folosește DUPĂ `authenticate`.
 *
 * Exemplu: router.get('/admin-only', authenticate, requireRole('ADMIN_HR'), handler)
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Neautentificat.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Acces interzis. Rol necesar: ${allowedRoles.join(' sau ')}.`,
      });
    }

    next();
  };
};