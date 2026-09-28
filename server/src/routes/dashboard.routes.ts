import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { summary } from '../controllers/dashboardController.js';

const router = Router();

// GET /api/dashboard/summary - role-aware summary
router.get('/summary', requireAuth, summary);

export default router;
