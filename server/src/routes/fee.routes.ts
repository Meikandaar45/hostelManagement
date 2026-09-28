import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { listFees, getFee, createFee, recordPayment, getReceipt } from '../controllers/feeController';

const router = Router();

router.use(requireAuth);

// Receipts are accessible to ADMIN, WARDEN, and the STUDENT who owns the receipt
router.get('/receipts/:id', requireRole('ADMIN', 'WARDEN', 'STUDENT'), getReceipt);

// All other fee management routes require ADMIN or WARDEN role
router.use(requireRole('ADMIN', 'WARDEN'));

router.get('/', listFees);
router.post('/', createFee);
router.get('/:id', getFee);
router.post('/:id/payments', recordPayment);

export default router;
