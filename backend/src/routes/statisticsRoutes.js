// =====================================================================
// Rute STATISTICS
// =====================================================================

import express from 'express';
import {
  getOverview,
  getAttendanceTrend,
  getLeavesByDepartment,
  getEmployeesByDepartment,
  getHoursThisWeek,
} from '../controllers/statisticsController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Statisticile sunt vizibile doar pentru ADMIN_HR și MANAGER
router.use(authenticate, requireRole('ADMIN_HR', 'MANAGER'));

router.get('/overview', getOverview);
router.get('/attendance-trend', getAttendanceTrend);
router.get('/leaves-by-department', getLeavesByDepartment);
router.get('/employees-by-department', getEmployeesByDepartment);
router.get('/hours-this-week', getHoursThisWeek);

export default router;