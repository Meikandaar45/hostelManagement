import { Router } from 'express';
import { testConnection } from '../db/pool.js';

const router = Router();

router.get('/', async (_req, res) => {
  const dbOk = await testConnection();
  res.status(dbOk ? 200 : 503).json({
    success: true,
    data: {
      application: 'ok',
      database: dbOk ? 'ok' : 'unavailable',
    },
  });
});

export default router;
