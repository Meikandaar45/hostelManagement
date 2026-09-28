import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { index, create, show, update, updateStatus } from '../controllers/userController.js';

const router = Router();

// All user routes require ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', index);
router.post('/', create);
router.get('/:id', show);
router.patch('/:id', update);
router.patch('/:id/status', updateStatus);

export default router;
