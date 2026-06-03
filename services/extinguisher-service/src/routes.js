const { Router } = require('express');
const { authenticate, requireRole } = require('@fems/shared');
const c = require('./controller');

const router = Router();

// Any authenticated user can read.
router.get('/extinguishers', authenticate, c.list);
router.get('/extinguishers/:id', authenticate, c.getById);

// Any authenticated user can send a request about an extinguisher.
router.post('/extinguishers/:id/request', authenticate, c.requestAction);

// Only admin can create (inspectors may NOT add extinguishers).
router.post('/extinguishers', authenticate, requireRole('admin'), c.create);

// Admin + inspector can update.
router.patch('/extinguishers/:id', authenticate, requireRole('admin', 'inspector'), c.update);

// Only admin can delete.
router.delete('/extinguishers/:id', authenticate, requireRole('admin'), c.remove);

module.exports = router;
