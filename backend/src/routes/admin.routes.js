const express = require('express');
const router = express.Router();

const {
  getDashboard,
  getAllAcademies,
  approveAcademy,
  rejectAcademy,
  suspendAcademy,
  getAllScouts,
  approveScout,
  suspendScout,
  getAllUsers,
} = require('../controllers/admin.controller');

const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// User management
router.get('/users', getAllUsers);

// Academy management
router.get('/academies', getAllAcademies);
router.put('/academies/:id/approve', approveAcademy);
router.put('/academies/:id/reject', rejectAcademy);
router.put('/academies/:id/suspend', suspendAcademy);

// Scout management
router.get('/scouts', getAllScouts);
router.put('/scouts/:id/approve', approveScout);
router.put('/scouts/:id/suspend', suspendScout);

module.exports = router;

