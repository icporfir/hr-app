// =====================================================================
// Rute ATTENDANCE
// =====================================================================

import express from 'express';
import {
  checkIn,
  checkOut,
  getMyToday,
  getByEmployee,
} from '../controllers/attendanceController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/me/today', getMyToday);
router.get('/employee/:employeeId', getByEmployee);

export default router;