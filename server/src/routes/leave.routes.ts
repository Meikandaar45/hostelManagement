import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  listLeave,
  submitLeave,
  getLeave,
  cancelLeave,
  approveLeave,
  rejectLeave,
  getGatePass,
} from '../controllers/leaveController.js';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('ADMIN', 'WARDEN', 'STUDENT'), listLeave);
router.post('/', requireRole('STUDENT'), submitLeave);
router.get('/:id', requireRole('ADMIN', 'WARDEN', 'STUDENT'), getLeave);
router.patch('/:id/cancel', requireRole('STUDENT'), cancelLeave);
router.patch('/:id/approve', requireRole('ADMIN', 'WARDEN'), approveLeave);
router.patch('/:id/reject', requireRole('ADMIN', 'WARDEN'), rejectLeave);
router.get('/:id/gate-pass', requireRole('ADMIN', 'WARDEN', 'STUDENT'), getGatePass);

export default router;
