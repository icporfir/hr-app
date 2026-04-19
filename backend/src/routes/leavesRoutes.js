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
} from '../controllers/leavesController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createLeaveRequest);
router.get('/', getLeaveRequests);
router.get('/:id', getLeaveById);
router.put('/:id/approve', requireRole('MANAGER', 'ADMIN_HR'), approveLeave);
router.put('/:id/reject', requireRole('MANAGER', 'ADMIN_HR'), rejectLeave);
router.put('/:id/cancel', cancelLeave);

export default router;