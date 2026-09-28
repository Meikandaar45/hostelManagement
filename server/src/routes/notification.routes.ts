import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  listNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
} from '../controllers/notificationController.js';

const router = Router();

router.use(requireAuth);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

export default router;
