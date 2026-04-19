// =====================================================================
// Helpers JWT — generare și verificare pentru access + refresh tokens
// =====================================================================

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';

// Access token: scurt (15 min) — trimis la fiecare request
const ACCESS_TOKEN_EXPIRES_IN = '15m';

// Refresh token: lung — depinde dacă user-ul a bifat "Remember me"
const REFRESH_TOKEN_EXPIRES_DAYS = {
  short: 1,   // "Ține-mă minte" = nebifat → 24h
  long: 30,   // "Ține-mă minte" = bifat → 30 zile
};

/**
 * Generează un access token scurt (15 min)
 * Payload: { userId, role, employeeId }
 */
export const generateAccessToken = (payload) => {
  if (!JWT_SECRET) throw new Error('JWT_SECRET nu este setat în .env');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

/**
 * Generează un refresh token (string random, NU JWT)
 * Motiv: refresh token-ul e stocat în DB, nu e parsabil client-side.
 * Folosim crypto.randomBytes pentru a nu expune informații în token.
 */
export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Calculează data expirării refresh token-ului
 * @param {boolean} rememberMe - dacă user-ul a bifat checkbox-ul
 * @returns {Date}
 */
export const getRefreshTokenExpiry = (rememberMe) => {
  const days = rememberMe ? REFRESH_TOKEN_EXPIRES_DAYS.long : REFRESH_TOKEN_EXPIRES_DAYS.short;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Verifică un access token și returnează payload-ul
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Pentru compatibilitate cu middleware-ul existent (care importă verifyToken)
export const verifyToken = verifyAccessToken;

// Pentru compatibilitate — vechi cod care importă generateToken
export const generateToken = generateAccessToken;