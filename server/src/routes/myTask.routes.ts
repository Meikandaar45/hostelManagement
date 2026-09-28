import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { getMyTasks } from '../controllers/complaintController.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('MAINTENANCE'));

router.get('/', getMyTasks);

export default router;
