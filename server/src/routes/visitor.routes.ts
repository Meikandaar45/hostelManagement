import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  listVisitors,
  recordVisitor,
  exitVisitor,
} from '../controllers/visitorController.js';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('ADMIN', 'WARDEN', 'STUDENT'), listVisitors);
router.post('/', requireRole('ADMIN', 'WARDEN'), recordVisitor);
router.patch('/:id/exit', requireRole('ADMIN', 'WARDEN'), exitVisitor);

export default router;
