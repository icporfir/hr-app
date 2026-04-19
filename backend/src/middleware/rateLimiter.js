// =====================================================================
// Rate Limiter — protecție împotriva atacurilor brute force
// Max 5 încercări de login per 15 minute per IP
// =====================================================================

import rateLimit from 'express-rate-limit';

/**
 * Limitator pentru endpoint-ul de login
 * - Fereastră: 15 minute
 * - Max: 5 cereri
 * - Returnează 429 (Too Many Requests) la depășire
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute în milisecunde
  max: 5,
  message: {
    success: false,
    message: 'Prea multe încercări de autentificare. Încearcă din nou în 15 minute.',
  },
  standardHeaders: true, // Adaugă header-ele RateLimit-* în răspuns
  legacyHeaders: false,
  // Numără doar login-urile eșuate, nu pe cele reușite
  skipSuccessfulRequests: true,
});

/**
 * Limitator pentru refresh token — mai permisiv
 * - Fereastră: 1 minut
 * - Max: 10 cereri
 * Motiv: interceptor-ul poate apela mai des dacă user-ul face multe cereri în paralel
 */
export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minut
  max: 10,
  message: {
    success: false,
    message: 'Prea multe cereri. Încearcă din nou în câteva secunde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});