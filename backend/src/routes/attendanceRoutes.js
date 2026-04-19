// =====================================================================
// Rute ATTENDANCE — pontaj zilnic (clasic + lunar)
// =====================================================================

import express from 'express';
import {
  checkIn,
  checkOut,
  getMyToday,
  getByEmployee,
  getMonthlyAttendance,
  bulkSaveAttendance,
} from '../controllers/attendanceController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

// --- Pontaj clasic (check-in/check-out) — păstrat pentru compatibilitate ---
router.post('/check-in',  checkIn);
router.post('/check-out', checkOut);
router.get('/me/today',   getMyToday);

// --- Pontaj lunar (Prompt 6+7) ---
// ATENȚIE: ordine — rutele specifice ÎNAINTE de /:employeeId
router.get('/monthly',    getMonthlyAttendance);
router.put('/bulk',       bulkSaveAttendance);

// --- Istoric pontaj per angajat ---
router.get('/employee/:employeeId', getByEmployee);

export default router;