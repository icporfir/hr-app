// =====================================================================
// Helpers JWT — generare și verificare tokenuri
// =====================================================================

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generează un token JWT cu payload-ul primit.
 * Payload tipic: { userId, role, employeeId }
 */
export const generateToken = (payload) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET nu este setat în .env');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifică un token și returnează payload-ul decodat.
 * Aruncă eroare dacă token-ul e invalid sau expirat.
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};