// =====================================================
// Punctul central unde vor fi montate toate rutele.
// În Prompt 2 vom adăuga: auth, employees, leaves etc.
// =====================================================

import express from 'express';

const router = express.Router();

// Ruta de test — verifică dacă serverul e funcțional
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server HR funcțional ✅',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// AICI vor fi montate rutele în prompturile următoare:
// router.use('/auth', authRoutes);
// router.use('/employees', employeeRoutes);
// router.use('/leaves', leaveRoutes);
// router.use('/attendance', attendanceRoutes);
// router.use('/documents', documentRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/jobs', jobRoutes);
// router.use('/reports', reportRoutes);

export default router;