import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  listComplaints,
  createComplaint,
  getComplaint,
  updateStatus,
  assignComplaint,
  getHistory,
} from '../controllers/complaintController.js';

const router = Router();

router.use(requireAuth);

router.get('/', listComplaints);
router.post('/', requireRole('STUDENT'), createComplaint);
router.get('/:id', getComplaint);
router.patch('/:id/status', requireRole('ADMIN', 'WARDEN', 'MAINTENANCE'), updateStatus);
router.post('/:id/assign', requireRole('ADMIN', 'WARDEN'), assignComplaint);
router.get('/:id/history', getHistory);

export default router;
