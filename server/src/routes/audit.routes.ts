import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { index, actions } from '../controllers/auditController.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', index);
router.get('/actions', actions);

export default router;
