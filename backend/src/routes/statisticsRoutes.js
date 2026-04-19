// =====================================================================
// Rute STATISTICS — acces doar pentru ADMIN_HR și MANAGER
// =====================================================================

import express from 'express';
import {
  getOverview,
  getAttendanceTrend,
  getLeavesByDepartment,
  getEmployeesByDepartment,
  getHoursThisWeek,
  getRecentEmployees,
} from '../controllers/statisticsController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Toate rutele necesită autentificare + rol ADMIN_HR sau MANAGER
router.use(authenticate);
router.use(requireRole('ADMIN_HR', 'MANAGER'));

// Rutele existente
router.get('/overview',                getOverview);
router.get('/attendance-trend',        getAttendanceTrend);
router.get('/leaves-by-department',    getLeavesByDepartment);
router.get('/employees-by-department', getEmployeesByDepartment);
router.get('/hours-this-week',         getHoursThisWeek);

// Rută nouă
router.get('/recent-employees',        getRecentEmployees);

export default router;