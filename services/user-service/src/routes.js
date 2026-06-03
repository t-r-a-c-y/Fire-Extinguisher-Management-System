const { Router } = require('express');
const { authenticate, requireRole } = require('@fems/shared');
const auth = require('./authController');
const users = require('./userController');

const router = Router();

// ---- Auth (public) --------------------------------------------------------
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', auth.logout);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/reset-password', auth.resetPassword);

// ---- Current user profile (any authenticated user) ------------------------
router.get('/users/me', authenticate, users.getMe);
router.patch('/users/me', authenticate, users.updateMe);
router.post('/users/me/change-password', authenticate, users.changePassword);

// ---- Admin user management ------------------------------------------------
router.get('/users', authenticate, requireRole('admin'), users.listUsers);
router.post('/users', authenticate, requireRole('admin'), users.createUser);
router.get('/users/:id', authenticate, requireRole('admin'), users.getUser);
router.patch('/users/:id', authenticate, requireRole('admin'), users.updateUser);
router.delete('/users/:id', authenticate, requireRole('admin'), users.deleteUser);

module.exports = router;
