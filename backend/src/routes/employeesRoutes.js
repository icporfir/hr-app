// =====================================================================
// Rute EMPLOYEES
// =====================================================================

import express from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
} from '../controllers/employeesController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Toate rutele necesită autentificare
router.use(authenticate);

// Lista departamentelor — accesibilă tuturor utilizatorilor autentificați
router.get('/departments/list', getDepartments);

// CRUD
router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', requireRole('ADMIN_HR'), createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', requireRole('ADMIN_HR'), deleteEmployee);

export default router;