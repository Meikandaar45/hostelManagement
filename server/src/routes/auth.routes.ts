import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  setup,
  setupStatus,
  login,
  logout,
  me,
  forgotPassword,
  resetPasswordHandler,
  changePasswordHandler,
} from '../controllers/authController.js';

const router = Router();

router.get('/setup-status', setupStatus);
router.post('/setup', authRateLimiter, setup);
router.post('/login', authRateLimiter, login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPasswordHandler);
router.post('/change-password', requireAuth, changePasswordHandler);

export default router;
