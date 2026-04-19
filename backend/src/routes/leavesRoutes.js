// =====================================================================
// Rute LEAVES
// =====================================================================

import express from 'express';
import {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveById,
  approveLeave,
  rejectLeave,
  cancelLeave,
  exportLeaves,       // ← NOU (export Excel)
  getCalendar,        // ← NOU (calendar vizual)
} from '../controllers/leavesController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

// ATENȚIE: rutele specifice (/export, /calendar) TREBUIE să fie
// înaintea rutelor cu parametru (/:id), altfel Express le va trata
// pe "export" și "calendar" ca fiind valori pentru :id.

// Export Excel — doar ADMIN_HR și MANAGER
router.get('/export', requireRole('ADMIN_HR', 'MANAGER'), exportLeaves);

// Calendar — toate rolurile; filtrarea pe rol se face în controller
router.get('/calendar', getCalendar);

// Rute existente
router.post('/', createLeaveRequest);
router.get('/', getLeaveRequests);
router.get('/:id', getLeaveById);
router.put('/:id/approve', requireRole('MANAGER', 'ADMIN_HR'), approveLeave);
router.put('/:id/reject',  requireRole('MANAGER', 'ADMIN_HR'), rejectLeave);
router.put('/:id/cancel',  cancelLeave);

export default router;