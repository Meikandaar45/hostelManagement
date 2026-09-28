import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { getMyProfile, getMyRoom, getMyFees } from '../controllers/meController';

const router = Router();

router.use(requireAuth);
// These are exclusively for STUDENT role
router.use(requireRole('STUDENT'));

router.get('/profile', getMyProfile);
router.get('/room', getMyRoom);
router.get('/fees', getMyFees);

export default router;
