// =====================================================================
// Rute NOTIFICATIONS
// Toate rutele necesită autentificare.
// User-ul vede doar propriile notificări (filtrare în controller).
// =====================================================================

import express from 'express';
import {
  getRecentNotifications,
  listNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

// ATENȚIE: rutele specifice merg ÎNAINTE celor cu parametru (/:id)
router.get('/recent',        getRecentNotifications);
router.get('/',              listNotifications);
router.put('/read-all',      markAllAsRead);
router.put('/:id/read',      markAsRead);

export default router;