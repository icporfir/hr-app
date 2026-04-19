// =====================================================================
// Rute Auth — login, logout, me, refresh (cu rate limiting pe login)
// =====================================================================

import express from 'express';
import { login, logout, getMe, refresh } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { loginLimiter, refreshLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/auth/login — rate limited 5/15min
router.post('/login', loginLimiter, login);

// POST /api/auth/refresh — rate limited 10/1min (mai permisiv)
router.post('/refresh', refreshLimiter, refresh);

// POST /api/auth/logout — acceptă și neautentificat (pentru a curăța refresh token)
router.post('/logout', logout);

// GET /api/auth/me — necesită autentificare
router.get('/me', authenticate, getMe);

export default router;