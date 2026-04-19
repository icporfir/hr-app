// =====================================================================
// Agregator rute API — punctul central unde se montează toate modulele
// =====================================================================

import express from 'express';
import authRoutes from './authRoutes.js';
import employeesRoutes from './employeesRoutes.js';
import leavesRoutes from './leavesRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import statisticsRoutes from './statisticsRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = express.Router();

// Health check — nu necesită autentificare
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server HR funcțional ✅',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Module API
router.use('/auth', authRoutes);
router.use('/employees', employeesRoutes);
router.use('/leaves', leavesRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/notifications', notificationRoutes);

export default router;