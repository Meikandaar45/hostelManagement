import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();

// Only ADMIN and WARDEN can access reporting endpoints
router.use(requireAuth, requireRole('ADMIN', 'WARDEN'));

router.get('/students', reportController.students);
router.get('/rooms', reportController.rooms);
router.get('/fees', reportController.fees);
router.get('/payments', reportController.payments);
router.get('/complaints', reportController.complaints);
router.get('/leave', reportController.leave);
router.get('/visitors', reportController.visitors);

export default router;
